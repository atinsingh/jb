#!/usr/bin/env python3
"""Jobocate transport shim over Resume-Matcher 1.3.0.

This file deliberately contains no scoring weights or recommendation logic.
It prepares the current LaTeX revision for Resume-Matcher and prints that
project's response unchanged for the Nest adapter to map into API field names.
"""

import asyncio
import json
import os
import sys
from pathlib import Path


def configure(payload: dict) -> None:
    base = os.environ.get("JOBOCATE_LITELLM_BASE_URL", "").rstrip("/")
    key = os.environ.get("JOBOCATE_LITELLM_API_KEY", "")
    if not base or not key:
        raise RuntimeError("LiteLLM routing is unavailable")
    os.environ["LLM_PROVIDER"] = "openai_compatible"
    # Force LiteLLM's OpenAI-compatible transport while preserving the full
    # Jobocate alias as the model name sent to the proxy. Without this outer
    # prefix, an alias such as `anthropic/...` bypasses the shared proxy.
    os.environ["LLM_MODEL"] = f"openai/{payload['alias']}"
    os.environ["LLM_API_BASE"] = base if base.endswith("/v1") else f"{base}/v1"
    os.environ["LLM_API_KEY"] = key
    os.environ["LITELLM_TAGS"] = "harness=ats"
    # The pinned image defaults its SQLite/config directory to the installed
    # package tree, which is intentionally read-only for the sandbox user.
    os.environ.setdefault("DATA_DIR", "/workspace/.resume-matcher")


async def analyze(payload: dict) -> dict:
    # Imports follow env setup because Resume-Matcher loads settings at import.
    from app.llm import get_router
    from app.services.ats import compute_ats_score
    from app.services.improver import extract_job_keywords
    from app.services.parser import parse_resume_to_json
    from app.services.refiner import analyze_keyword_gaps, calculate_keyword_match

    # Add proxy attribution without changing Resume-Matcher scoring inputs.
    router, _ = get_router()
    for deployment in getattr(router, "model_list", []):
        params = deployment.setdefault("litellm_params", {})
        # Resume-Matcher intentionally substitutes a no-key sentinel for the
        # openai_compatible provider. Replace it in memory with the same
        # per-user virtual key already supplied to the résumé harness.
        params["api_key"] = os.environ["JOBOCATE_LITELLM_API_KEY"]
        headers = dict(params.get("extra_headers") or {})
        headers["x-litellm-tags"] = "harness=ats"
        params["extra_headers"] = headers

    # These model calls use independent inputs. Run them together so preview
    # latency is bounded by the slower call instead of their sum.
    resume, job_keywords = await asyncio.gather(
        parse_resume_to_json(payload["latex"]),
        extract_job_keywords(payload["jobDescription"]),
    )
    gaps = analyze_keyword_gaps(job_keywords, resume, resume)
    match = calculate_keyword_match(resume, job_keywords)
    return compute_ats_score(
        refined_resume=resume,
        job_keywords=job_keywords,
        keyword_match_percentage=match,
        missing_keywords=gaps.non_injectable_keywords,
        injectable_keywords=gaps.injectable_keywords,
    )


def main() -> int:
    if len(sys.argv) != 2:
        print("input path required", file=sys.stderr)
        return 2
    try:
        payload = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
        configure(payload)
        print(json.dumps(asyncio.run(analyze(payload)), separators=(",", ":")))
        return 0
    except Exception as exc:
        # Do not print the résumé, job description, key, or model response.
        print(f"ATS analysis failed: {type(exc).__name__}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
