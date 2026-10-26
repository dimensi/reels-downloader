"""Deploy an immutable image and verify readiness without logging private metadata."""
import json
import os
import time
import urllib.error
import urllib.request

base = os.environ["COOLIFY_URL"].rstrip("/") + "/api/v1"
application = os.environ["COOLIFY_APP_UUID"]
revision = os.environ["DEPLOY_SHA"]


def api(method, path, data=None):
    request = urllib.request.Request(
        base + path,
        method=method,
        data=json.dumps(data).encode() if data is not None else None,
        headers={
            "Authorization": "Bearer " + os.environ["COOLIFY_TOKEN"],
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"Deployment API returned HTTP {error.code}") from None
    except urllib.error.URLError:
        raise RuntimeError("Deployment API is unavailable") from None


api("PATCH", "/applications/" + application, {"docker_registry_image_tag": revision})
deployment = api("POST", "/deploy", {"uuid": application})["deployments"][0]["deployment_uuid"]
for attempt in range(120):
    status = api("GET", "/deployments/" + deployment)["status"]
    if status == "finished":
        break
    if status in {"failed", "cancelled", "cancelled-by-user"}:
        raise RuntimeError("Deployment did not complete successfully")
    time.sleep(5)
else:
    raise RuntimeError("Timed out waiting for deployment")

for attempt in range(60):
    app = api("GET", "/applications/" + application)
    if app.get("docker_registry_image_tag") != revision:
        raise RuntimeError("Deployed image does not match the requested revision")
    if app.get("status") == "running:healthy":
        print("Requested revision is deployed and healthy")
        break
    time.sleep(5)
else:
    raise RuntimeError("Timed out waiting for application readiness")
