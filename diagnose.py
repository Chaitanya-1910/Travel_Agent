"""
Quick diagnostic — run this to check your .env and IBM credentials.
Usage:  python diagnose.py
"""
import os
from dotenv import load_dotenv

load_dotenv()

api_key    = os.getenv("IBM_API_KEY", "")
project_id = os.getenv("IBM_PROJECT_ID", "")
url        = os.getenv("IBM_URL", "")
model_id   = os.getenv("IBM_MODEL_ID", "")

print("=" * 60)
print("ENV CHECK")
print("=" * 60)
print(f"IBM_API_KEY    : {'✅ set (' + str(len(api_key)) + ' chars)' if api_key else '❌ MISSING or EMPTY'}")
print(f"IBM_PROJECT_ID : {'✅ set (' + str(len(project_id)) + ' chars)' if project_id else '❌ MISSING or EMPTY'}")
print(f"IBM_URL        : {url if url else '❌ MISSING or EMPTY'}")
print(f"IBM_MODEL_ID   : {model_id if model_id else '(not set, will use default)'}")

if not api_key or not project_id or not url:
    print("\n❌ Fix the missing values above in your .env file, then re-run.")
    exit(1)

print("\n" + "=" * 60)
print("IBM CONNECTION TEST")
print("=" * 60)
try:
    from ibm_watsonx_ai import Credentials
    from ibm_watsonx_ai.foundation_models import ModelInference

    creds = Credentials(url=url, api_key=api_key)
    model = ModelInference(
        model_id=model_id or "meta-llama/llama-3-3-70b-instruct",
        credentials=creds,
        project_id=project_id,
    )
    result = model.generate_text(prompt="Say OK")
    print(f"✅ Connection successful! Model responded: {result[:80]}")
except Exception as e:
    print(f"❌ Connection failed: {e}")
    print("\nCommon causes:")
    print("  • IBM_API_KEY is wrong/expired → regenerate at cloud.ibm.com/iam/apikeys")
    print("  • IBM_PROJECT_ID is wrong       → check dataplatform.cloud.ibm.com → project → Manage → General")
    print("  • IBM_URL region doesn't match your WML service region")
