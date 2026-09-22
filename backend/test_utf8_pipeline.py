import os
import sys
import unittest
import numpy as np
import cv2

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.utils.utf8_utils import (
    init_utf8_environment,
    ensure_utf8,
    clean_ascii_for_cv2,
    parse_motion_prompt
)
from app.services.video_service import video_processor, PhotoStructureAnalyzer
from app.services.ai_service import ai_service
from app.ai.chat_graph import chat_orchestrator


class TestUTF8VideoGenerationPipeline(unittest.TestCase):
    """
    Comprehensive verification of UTF-8 encoding across text processing,
    resolving 'charmap' / cp1252 codec failures when processing special characters,
    emojis, BGM tags, and detailed motion instruction strings.
    """

    def setUp(self):
        init_utf8_environment()
        os.makedirs("./uploads/videos", exist_ok=True)
        os.makedirs("./uploads/images", exist_ok=True)

    def test_01_utf8_sanitization_and_normalization(self):
        """Test Unicode normalization and safe byte conversions"""
        raw_text = "🏛️ Orbit around the house ✨ with stars & sea 🌊 [BGM: 🎵 ambient_waves] “cinematic—cut”"
        normalized = ensure_utf8(raw_text)
        self.assertIn("🏛️", normalized)
        self.assertIn("🌊", normalized)
        self.assertIn("✨", normalized)
        self.assertIn("🎵", normalized)

    def test_02_clean_ascii_for_cv2(self):
        """Test cv2.putText ASCII sanitizer strips multi-byte characters to prevent OpenCV memory errors"""
        raw_text = "🏛️ Orbit around the house ✨ [BGM: 🎵 Lo-Fi] “AuraEdit”"
        ascii_cleaned = clean_ascii_for_cv2(raw_text)
        # Verify no char outside ord 32-126
        for c in ascii_cleaned:
            self.assertTrue(32 <= ord(c) <= 126, f"Character {c} (ord {ord(c)}) is not printable ASCII")
        self.assertIn("Orbit around the house", ascii_cleaned)
        self.assertIn('"AuraEdit"', ascii_cleaned)

    def test_03_parse_motion_prompt_rich_emojis_and_bgm(self):
        """Test prompt parser handles emojis, motion tags, duration, and BGM tags"""
        prompt = "🏛️ 3D Orbit around the villa ✨ twinkling sky 🌊 coastal waves [BGM: cinematic_space_ambient] [Motion: 3D Deep Orbital Arc] 6.0s"
        parsed = parse_motion_prompt(prompt)
        
        self.assertEqual(parsed["bgm"], "cinematic_space_ambient")
        self.assertEqual(parsed["motion_style"], "3d_deep_orbital_arc")
        self.assertEqual(parsed["motion_tag"], "3D Deep Orbital Arc")
        self.assertEqual(parsed["duration"], 6.0)
        self.assertTrue(parsed["has_special_characters"])
        self.assertTrue(len(parsed["emojis"]) >= 3)

    def test_04_generate_image_to_video_with_emojis_and_bgm(self):
        """Test Image-to-Video generation engine executes smoothly with emojis and BGM without codec errors"""
        test_out = os.path.join("uploads", "videos", "test_utf8_video.mp4")
        if os.path.exists(test_out):
            try:
                os.remove(test_out)
            except Exception:
                pass

        # Create sample test image in memory
        sample_img = np.zeros((720, 1280, 3), dtype=np.uint8)
        sample_img[0:360, :] = [60, 30, 20]     # Sky
        sample_img[360:720, :] = [180, 120, 40]  # Water / foreground

        prompt_with_emojis = "🏛️ Pan around the 3D house ✨ with celestial stars & ocean waves 🌊 [BGM: 🎵 Lo-Fi Waves] [Motion: orbital_arc_with_crane]"
        
        result = video_processor.generate_image_to_video(
            image_input=sample_img,
            output_path=test_out,
            prompt=prompt_with_emojis,
            duration=1.0,
            fps=15,
            target_width=640,
            target_height=360
        )

        self.assertEqual(result["status"], "success")
        self.assertEqual(result["motion_style"], "orbital_arc_with_crane")
        self.assertEqual(result["bgm"], "🎵 Lo-Fi Waves")
        self.assertIn("🏛️", result["prompt"])
        self.assertTrue(os.path.exists(test_out), "Video output file was not created")
        self.assertGreater(os.path.getsize(test_out), 1000, "Video output file is empty")

    def test_05_ai_service_image_to_video_async(self):
        """Test AIService.image_to_video asynchronous pipeline with rich UTF-8 prompt"""
        import asyncio
        
        sample_img = np.zeros((360, 640, 3), dtype=np.uint8)
        _, img_encoded = cv2.imencode('.png', sample_img)
        img_bytes = img_encoded.tobytes()

        prompt = "🌊 Living waters coastal dolly ✨ starry sky ⚡ cyberpunk pulse [BGM: synthwave_neon_retro] 4.0s"

        async def run_test():
            return await ai_service.image_to_video(
                image_bytes=img_bytes,
                filename="coastal_photo.png",
                content_type="image/png",
                prompt=prompt,
                duration=1.0,
                fps=15
            )

        res = asyncio.run(run_test())
        self.assertEqual(res["status"], "success")
        self.assertEqual(res["bgm"], "synthwave_neon_retro")
        self.assertIn("🌊", res["prompt"])
        self.assertTrue(res["video_url"].startswith("/uploads/videos/"))

    def test_06_chat_orchestrator_multi_turn_with_emojis_and_bgm(self):
        """Test LangGraph Chat Orchestrator parses user emoji prompts and BGM tags"""
        session_id = "test_utf8_session_01"
        user_message = "🏛️ Can you pan around the 3D house with celestial stars ✨ and ocean waves 🌊? [BGM: cinematic_orchestra]"

        turn_result = chat_orchestrator.process_turn(
            user_input=user_message,
            session_id=session_id,
            media_type="image"
        )

        self.assertEqual(turn_result["session_id"], session_id)
        self.assertEqual(turn_result["intent"], "image_to_video")
        self.assertTrue(turn_result["execution_ready"])
        self.assertIsNotNone(turn_result["execution_payload"])
        self.assertEqual(turn_result["execution_payload"]["bgm"], "cinematic_orchestra")
        self.assertTrue("rotation" in turn_result["execution_payload"]["motion_style"] or "orbit" in turn_result["execution_payload"]["motion_style"])
        self.assertIn("🏛️", turn_result["execution_payload"]["prompt"])
        self.assertIn("🎵 cinematic_orchestra", turn_result["message"])


if __name__ == "__main__":
    unittest.main()
