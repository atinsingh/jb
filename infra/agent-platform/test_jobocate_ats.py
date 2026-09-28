import asyncio
import importlib.util
import os
import sys
import types
import unittest
from pathlib import Path


class FakeRouter:
    def __init__(self):
        self.model_list = [{"litellm_params": {"api_key": "no-key"}}]


class AtsTransportTest(unittest.TestCase):
    def test_owner_key_tags_and_serial_model_calls(self):
        router = FakeRouter()
        started = set()
        active = 0
        peak = 0

        async def independent_model_call(name):
            nonlocal active, peak
            started.add(name)
            active += 1
            peak = max(peak, active)
            await asyncio.sleep(0)
            active -= 1
            return {"required_skills": ["Node.js", "Go"], "preferred_skills": ["Kubernetes"], "keywords": ["microservices", "payment services"]}

        llm = types.ModuleType("app.llm")
        llm.get_router = lambda: (router, None)

        ats = types.ModuleType("app.services.ats")
        scored = {}
        def compute(**kwargs):
            scored.update(kwargs)
            return {"overall_score": 100}
        ats.compute_ats_score = compute
        improver = types.ModuleType("app.services.improver")
        improver.extract_job_keywords = lambda _jd: independent_model_call("job")
        parser = types.ModuleType("app.services.parser")
        parser.parse_resume_to_json = lambda _resume: independent_model_call("resume")
        refiner = types.ModuleType("app.services.refiner")
        refiner.analyze_keyword_gaps = lambda *_args: types.SimpleNamespace(
            non_injectable_keywords=[], injectable_keywords=[]
        )
        refiner.calculate_keyword_match = lambda *_args: 100

        modules = {
            "app": types.ModuleType("app"),
            "app.llm": llm,
            "app.services": types.ModuleType("app.services"),
            "app.services.ats": ats,
            "app.services.improver": improver,
            "app.services.parser": parser,
            "app.services.refiner": refiner,
        }
        previous = {name: sys.modules.get(name) for name in modules}
        sys.modules.update(modules)
        old_key = os.environ.get("JOBOCATE_LITELLM_API_KEY")
        os.environ["JOBOCATE_LITELLM_API_KEY"] = "sk-owner-key"
        try:
            path = Path(__file__).with_name("jobocate_ats.py")
            spec = importlib.util.spec_from_file_location("jobocate_ats_tested", path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            asyncio.run(asyncio.wait_for(
                module.analyze({"latex": "resume", "jobDescription": "Build Node.js payment services. Kubernetes is desirable; ongoing reliability work.", "tags": ["ownerType=candidate", "logicalRunId=run-1"]}),
                timeout=1,
            ))
        finally:
            if old_key is None:
                os.environ.pop("JOBOCATE_LITELLM_API_KEY", None)
            else:
                os.environ["JOBOCATE_LITELLM_API_KEY"] = old_key
            for name, value in previous.items():
                if value is None:
                    sys.modules.pop(name, None)
                else:
                    sys.modules[name] = value

        self.assertEqual(
            router.model_list[0]["litellm_params"]["api_key"],
            "sk-owner-key",
        )
        self.assertEqual(started, {"resume", "job"})
        self.assertEqual(peak, 1)
        self.assertEqual(scored["job_keywords"]["required_skills"], ["Node.js"])
        self.assertEqual(scored["job_keywords"]["preferred_skills"], ["Kubernetes"])
        self.assertEqual(scored["job_keywords"]["keywords"], ["payment services"])
        self.assertEqual(router.model_list[0]["litellm_params"]["extra_headers"]["x-litellm-tags"], "ownerType=candidate,logicalRunId=run-1")


if __name__ == "__main__":
    unittest.main()
