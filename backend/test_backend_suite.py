import io
import os
import time
import uuid
from fastapi.testclient import TestClient
from PIL import Image as PILImage
from app.main import app
from app.database import Base, engine

client = TestClient(app)

def test_health_checks():
    print("Testing /health and /api/health...")
    r1 = client.get("/health")
    assert r1.status_code == 200, f"Expected 200, got {r1.status_code}: {r1.text}"
    assert r1.json()["status"] == "healthy"

    r2 = client.get("/api/health")
    assert r2.status_code == 200, f"Expected 200, got {r2.status_code}: {r2.text}"
    assert r2.json()["status"] == "healthy"
    print("[PASS] Health checks passed!")

def test_auth_full_lifecycle():
    print("Testing auth full lifecycle...")
    unique_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    password = "SecurePassword123!"

    # 1. Register
    r_reg = client.post("/api/auth/register", json={
        "email": unique_email,
        "password": password,
        "full_name": "Test User",
        "username": f"user_{uuid.uuid4().hex[:6]}"
    })
    assert r_reg.status_code == 201, f"Register failed: {r_reg.text}"
    user_data = r_reg.json()
    assert user_data["email"] == unique_email

    # 2. Login
    r_login = client.post("/api/auth/login", json={
        "email": unique_email,
        "password": password
    })
    assert r_login.status_code == 200, f"Login failed: {r_login.text}"
    token_data = r_login.json()
    assert "access_token" in token_data
    access_token = token_data["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    # 3. OTP Flow with Email
    r_otp = client.post("/api/auth/send-otp", json={
        "email": unique_email,
        "password": password
    })
    assert r_otp.status_code == 200, f"Send OTP email failed: {r_otp.text}"
    otp_res = r_otp.json()
    assert otp_res["status"] == "success"

    # 4. OTP Flow with Phone (SMS)
    phone = f"+1555{uuid.uuid4().int % 10000000:07d}"
    r_phone_otp = client.post("/api/auth/send-otp", json={
        "phone_number": phone
    })
    assert r_phone_otp.status_code == 200, f"Send OTP phone failed: {r_phone_otp.text}"
    phone_res = r_phone_otp.json()
    assert phone_res["status"] == "success"
    if phone_res.get("dev_otp"):
        r_vphone = client.post("/api/auth/verify-otp", json={
            "phone_number": phone,
            "otp_code": phone_res["dev_otp"]
        })
        assert r_vphone.status_code == 200, f"Verify OTP phone failed: {r_vphone.text}"
        assert "access_token" in r_vphone.json()

    # 5. Token Refresh
    r_refresh = client.post("/api/auth/refresh", json={
        "refresh_token": access_token
    })
    assert r_refresh.status_code == 200, f"Token refresh failed: {r_refresh.text}"
    assert "access_token" in r_refresh.json()

    # 6. Forgot Password
    r_forgot = client.post("/api/auth/forgot-password", json={
        "email": unique_email
    })
    assert r_forgot.status_code == 200, f"Forgot password failed: {r_forgot.text}"
    assert r_forgot.json()["success"] is True

    # 7. User Profile
    r_prof = client.get("/api/users/profile", headers=headers)
    assert r_prof.status_code == 200, f"Get profile failed: {r_prof.text}"
    assert r_prof.json()["email"] == unique_email

    # 8. Update Profile
    r_uprof = client.put("/api/users/profile", json={"full_name": "Updated Name"}, headers=headers)
    assert r_uprof.status_code == 200, f"Update profile failed: {r_uprof.text}"
    assert r_uprof.json()["full_name"] == "Updated Name"

    # 9. Change Password
    new_pass = "BrandNewPass456!"
    r_chpass = client.post("/api/users/change-password", json={
        "current_password": password,
        "new_password": new_pass
    }, headers=headers)
    assert r_chpass.status_code == 200, f"Change password failed: {r_chpass.text}"

    # 10. User Credits
    r_cred = client.get("/api/users/credits", headers=headers)
    assert r_cred.status_code == 200, f"Get credits failed: {r_cred.text}"
    assert "credits_remaining" in r_cred.json()
    assert "total_edits" in r_cred.json()
    print("[PASS] Auth & User Lifecycle passed!")

def test_projects_crud():
    print("Testing projects CRUD...")
    unique_email = f"proj_user_{uuid.uuid4().hex[:8]}@example.com"
    client.post("/api/auth/register", json={
        "email": unique_email,
        "password": "Password123!",
        "full_name": "Project Manager"
    })
    token = client.post("/api/auth/login", json={"email": unique_email, "password": "Password123!"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Project
    r_p = client.post("/api/projects", json={
        "name": "Cinematic Commercial",
        "description": "4K Multimodal AI Project",
        "type": "video"
    }, headers=headers)
    assert r_p.status_code == 201, f"Create project failed: {r_p.text}"
    proj_id = r_p.json()["id"]

    # 2. List Projects
    r_list = client.get("/api/projects", headers=headers)
    assert r_list.status_code == 200
    assert len(r_list.json()) >= 1

    # 3. Get Project
    r_get = client.get(f"/api/projects/{proj_id}", headers=headers)
    assert r_get.status_code == 200
    assert r_get.json()["name"] == "Cinematic Commercial"

    # 4. Update Project
    r_put = client.put(f"/api/projects/{proj_id}", json={
        "name": "Cinematic Commercial (Final Cut)",
        "description": "Updated description"
    }, headers=headers)
    assert r_put.status_code == 200
    assert r_put.json()["name"] == "Cinematic Commercial (Final Cut)"

    # 5. Project Assets
    r_assets = client.get(f"/api/projects/{proj_id}/assets", headers=headers)
    assert r_assets.status_code == 200
    assert "images" in r_assets.json()
    assert "videos" in r_assets.json()

    # 6. Delete Project
    r_del = client.delete(f"/api/projects/{proj_id}", headers=headers)
    assert r_del.status_code == 200
    print("[PASS] Projects CRUD passed!")

def test_images_and_videos_pipeline():
    print("Testing images & videos pipeline...")
    unique_email = f"media_user_{uuid.uuid4().hex[:8]}@example.com"
    client.post("/api/auth/register", json={"email": unique_email, "password": "Password123!"})
    token = client.post("/api/auth/login", json={"email": unique_email, "password": "Password123!"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create project
    r_p = client.post("/api/projects", json={"name": "Media Project", "type": "image"}, headers=headers)
    proj_id = r_p.json()["id"]

    # Create dummy image
    img_buf = io.BytesIO()
    PILImage.new("RGB", (640, 480), color=(50, 100, 150)).save(img_buf, format="PNG")
    img_buf.seek(0)

    # 1. Upload Image
    r_up_img = client.post(
        "/api/images/upload",
        data={"project_id": proj_id},
        files={"file": ("test_photo.png", img_buf.getvalue(), "image/png")},
        headers=headers
    )
    assert r_up_img.status_code == 200, f"Upload image failed: {r_up_img.text}"
    img_id = r_up_img.json()["id"]

    # 2. List Project Images
    r_p_imgs = client.get(f"/api/images/project/{proj_id}", headers=headers)
    assert r_p_imgs.status_code == 200
    assert len(r_p_imgs.json()) >= 1

    # 3. Edit Image
    r_edit_img = client.post(
        f"/api/images/{img_id}/edit",
        json={"edit_type": "vintage", "prompt": "Apply vintage film filter"},
        headers=headers
    )
    assert r_edit_img.status_code == 200, f"Edit image failed: {r_edit_img.text}"
    assert r_edit_img.json()["success"] is True

    # 4. Get Image History
    r_hist = client.get(f"/api/images/{img_id}/history", headers=headers)
    assert r_hist.status_code == 200
    assert len(r_hist.json()["history"]) >= 1

    # 5. Export Image
    r_exp = client.post(f"/api/images/{img_id}/export?format=png", headers=headers)
    assert r_exp.status_code == 200
    assert "export_url" in r_exp.json()

    # 6. Upload Video
    dummy_vid_bytes = b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00isommp42"
    r_up_vid = client.post(
        "/api/videos/upload",
        data={"project_id": proj_id},
        files={"file": ("clip.mp4", dummy_vid_bytes, "video/mp4")},
        headers=headers
    )
    assert r_up_vid.status_code == 200, f"Upload video failed: {r_up_vid.text}"
    vid_id = r_up_vid.json()["id"]

    # 7. List Project Videos
    r_p_vids = client.get(f"/api/videos/project/{proj_id}", headers=headers)
    assert r_p_vids.status_code == 200
    assert len(r_p_vids.json()) >= 1

    # 8. Trim Video
    r_trim = client.post(
        f"/api/videos/{vid_id}/trim",
        json={"start_time": 1.0, "end_time": 4.0},
        headers=headers
    )
    assert r_trim.status_code == 200, f"Trim video failed: {r_trim.text}"
    assert r_trim.json()["success"] is True

    # 9. Edit Video
    r_edit_vid = client.post(
        f"/api/videos/{vid_id}/edit",
        json={"edit_type": "teal_and_orange", "parameters": {"intensity": 0.9}},
        headers=headers
    )
    assert r_edit_vid.status_code == 200, f"Edit video failed: {r_edit_vid.text}"

    # 10. Video History & Progress
    r_vhist = client.get(f"/api/videos/{vid_id}/history", headers=headers)
    assert r_vhist.status_code == 200
    assert len(r_vhist.json()["history"]) >= 2

    r_vprog = client.get(f"/api/videos/{vid_id}/progress", headers=headers)
    assert r_vprog.status_code == 200
    assert r_vprog.json()["status"] == "completed"
    print("[PASS] Images & Videos Pipeline passed!")

def test_ai_multimodal_endpoints():
    print("Testing AI multimodal endpoints...")
    # 1. Multi-turn LangGraph Chat
    r_chat = client.post("/api/ai/chat", json={
        "message": "Make a photo into video with 3D orbit around the house",
        "session_id": f"sess_{uuid.uuid4().hex[:6]}"
    })
    assert r_chat.status_code == 200, f"AI chat failed: {r_chat.text}"
    chat_json = r_chat.json()
    assert "message" in chat_json
    assert "execution_ready" in chat_json
    print("[PASS] LangGraph AI chat passed!")

    # 2. AI Process Natural Language
    r_proc = client.post("/api/ai/process", json={
        "media_id": "test_photo",
        "media_type": "image",
        "prompt": "Enhance lighting and increase contrast"
    })
    assert r_proc.status_code == 200, f"AI process failed: {r_proc.text}"
    assert r_proc.json()["status"] == "completed"
    print("[PASS] AI process natural language passed!")

    # 3. Generative Fill (with auth)
    unique_email = f"ai_user_{uuid.uuid4().hex[:8]}@example.com"
    client.post("/api/auth/register", json={"email": unique_email, "password": "Password123!"})
    token = client.post("/api/auth/login", json={"email": unique_email, "password": "Password123!"}).json()["access_token"]
    ai_headers = {"Authorization": f"Bearer {token}"}

    img_buf = io.BytesIO()
    PILImage.new("RGB", (320, 240), color=(40, 60, 80)).save(img_buf, format="PNG")
    r_gen = client.post(
        "/api/ai/generative-fill",
        data={"prompt": "Add subtle warm sunlight ray"},
        files={"image": ("test.png", img_buf.getvalue(), "image/png")},
        headers=ai_headers
    )
    assert r_gen.status_code == 200, f"Generative fill failed: {r_gen.text}"
    assert r_gen.json()["status"] == "success"
    print("[PASS] Generative fill passed!")

    # 4. Image to Video Generation Pipeline
    r_img2vid = client.post(
        "/api/ai/image-to-video",
        data={"prompt": "Cinematic celestial starfield pan", "motion_style": "celestial_stars_flow", "duration": 2.0},
        files={"image": ("stars.png", img_buf.getvalue(), "image/png")}
    )
    assert r_img2vid.status_code == 200, f"Image-to-video failed: {r_img2vid.text}"
    assert r_img2vid.json()["status"] == "success"
    assert "video_url" in r_img2vid.json()
    print("[PASS] Image to Video AI synthesis passed!")

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    print("==================================================")
    print("STARTING AURAEDIT AI BACKEND INTEGRATION TEST SUITE")
    print("==================================================")
    test_health_checks()
    test_auth_full_lifecycle()
    test_projects_crud()
    test_images_and_videos_pipeline()
    test_ai_multimodal_endpoints()
    print("==================================================")
    print("ALL BACKEND TEST SUITES PASSED FLAWLESSLY! 100% OK")
    print("==================================================")
