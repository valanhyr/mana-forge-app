"""The engine must not initialize its integrated OTLP instrumentation."""

import builtins
import runpy
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import main


@pytest.mark.parametrize("endpoint_var", ["GRAFANA_OTLP_ENDPOINT", "OTEL_EXPORTER_OTLP_ENDPOINT"])
def test_otel_is_not_initialized_even_when_environment_enables_it(monkeypatch, endpoint_var):
    monkeypatch.setenv("OTEL_SDK_DISABLED", "false")
    monkeypatch.delenv("GRAFANA_OTLP_ENDPOINT", raising=False)
    monkeypatch.delenv("OTEL_EXPORTER_OTLP_ENDPOINT", raising=False)
    monkeypatch.setenv(endpoint_var, "http://127.0.0.1:9")
    monkeypatch.setenv("GRAFANA_OTLP_AUTH", "test-placeholder")

    original_import = builtins.__import__

    def reject_otel(name, *args, **kwargs):
        if name.startswith("opentelemetry"):
            raise AssertionError("the engine attempted to initialize OpenTelemetry")
        return original_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", reject_otel)
    namespace = runpy.run_path(str(Path(main.__file__)))
    app = namespace["app"]
    assert not hasattr(app.state, "otel_provider")
    with TestClient(app) as client:
        assert client.get("/health").json() == {"status": "ok", "service": "mana-forge-engine"}
