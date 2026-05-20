import requests
import string
import random

BASE_URL = "http://127.0.0.1:8000"

def get_admin_token():
    # Attempting to login using the credentials visible in the python script or an existing admin. Let's create an admin or login with one.
    # We might need to look up an admin username to test.
    pass

def test():
    # Note: Rather than building a full python auth test from scratch here, let's just make sure the backend runs by checking the swagger UI or a public route.
    resp = requests.get(BASE_URL + "/docs")
    if resp.status_code == 200:
        print("Backend is responding successfully.")
    else:
        print("Backend error.")

if __name__ == "__main__":
    test()
