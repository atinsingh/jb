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
    def test_analyze_puts_the_shared_proxy_key_on_the_in_memory_router(self):
        router = FakeRouter()
        started = set()

        async def independent_model_call(name):
            started.add(name)
            while len(started) < 2:
                await asyncio.sleep(0)
            return {}

        llm = types.ModuleType("app.llm")
        llm.get_router = lambda: (router, None)

        ats = types.ModuleType("app.services.ats")
        ats.compute_ats_score = lambda **kwargs: {"overall_score": 100}
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
        os.environ["JOBOCATE_LITELLM_API_KEY"] = "sk-shared-user-key"
        try:
            path = Path(__file__).with_name("jobocate_ats.py")
            spec = importlib.util.spec_from_file_location("jobocate_ats_tested", path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            asyncio.run(asyncio.wait_for(
                module.analyze({"latex": "resume", "jobDescription": "job"}),
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
            "sk-shared-user-key",
        )
        self.assertEqual(started, {"resume", "job"})


if __name__ == "__main__":
    unittest.main()
