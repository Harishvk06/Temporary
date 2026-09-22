import os
import sys
import unittest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.database import Base, engine

client = TestClient(app)

class TestExportPipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        os.makedirs("./uploads/images", exist_ok=True)
        os.makedirs("./uploads/videos", exist_ok=True)

    def test_01_direct_image_export_base64_png(self):
        """Test direct image export with a 1x1 transparent PNG data URL"""
        data_url = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        response = client.post("/api/images/export", json={
            "image_data": data_url,
            "format": "png",
            "quality": 95,
            "title": "test_master_image"
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIn("filename", data)
        self.assertIn("download_url", data)
        self.assertTrue(data["filename"].endswith(".png"))

        # Verify file download route
        dl_res = client.get(data["download_url"])
        self.assertEqual(dl_res.status_code, 200)
        self.assertIn("attachment", dl_res.headers.get("content-disposition", ""))

    def test_02_direct_image_export_jpg(self):
        """Test direct image export with JPG format and custom dimensions"""
        data_url = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        response = client.post("/api/images/export", json={
            "image_data": data_url,
            "format": "jpg",
            "quality": 90,
            "width": 640,
            "height": 480,
            "title": "test_photo_render"
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertTrue(data["filename"].endswith(".jpg"))

        # Verify file download route
        dl_res = client.get(data["download_url"])
        self.assertEqual(dl_res.status_code, 200)

    def test_03_direct_video_export_mp4(self):
        """Test direct video export endpoint with 60fps MP4 master"""
        response = client.post("/api/videos/export", json={
            "format": "mp4",
            "resolution": "1080p",
            "fps": 60,
            "include_audio": True,
            "title": "test_master_video"
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIn("filename", data)
        self.assertIn("download_url", data)
        self.assertTrue(data["filename"].endswith(".mp4"))

        # Verify file download route
        dl_res = client.get(data["download_url"])
        self.assertEqual(dl_res.status_code, 200)
        self.assertIn("attachment", dl_res.headers.get("content-disposition", ""))

    def test_04_direct_video_export_webm(self):
        """Test direct video export endpoint with WebM format"""
        response = client.post("/api/videos/export", json={
            "format": "webm",
            "resolution": "720p",
            "fps": 30,
            "title": "test_web_stream"
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertTrue(data["filename"].endswith(".webm"))

if __name__ == "__main__":
    unittest.main()
