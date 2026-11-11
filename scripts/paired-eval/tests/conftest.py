import importlib.util
import os
import sys

import pytest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture(scope="session")
def analyze():
    return _load("paired_eval_analyze", os.path.join(HERE, "..", "analyze.py"))


@pytest.fixture(scope="session")
def power():
    return _load("paired_eval_power", os.path.join(HERE, "..", "power.py"))
