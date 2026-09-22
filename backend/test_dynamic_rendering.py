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
    extract_continuous_motion_parameters,
    parse_motion_prompt
)
from app.services.video_service import (
    video_processor,
    PhotoStructureAnalyzer,
    DynamicCameraMotionSynthesizer
)
from app.services.ai_service import ai_service
from app.ai.chat_graph import chat_orchestrator, SESSION_MEMORY_STORE


class TestDynamicRenderingAndOrchestrator(unittest.TestCase):
    """
    Comprehensive verification of prompt-driven parametric video rendering:
    - 360-degree panoramic/spherical rotations
    - High-speed action sequences with directional velocity blur
    - Custom continuous multi-axis trajectories
    - High-definition sharp anti-aliasing and pixel-free output
    - LangGraph dynamic tool-calling, memory persistence, and intelligent clarification
    """

    def setUp(self):
        init_utf8_environment()
        os.makedirs("./uploads/videos", exist_ok=True)
        os.makedirs("./uploads/images", exist_ok=True)

    def test_01_continuous_motion_parameter_extraction_360_rotation(self):
        """Test extraction of 360-degree rotation and custom angle directives"""
        prompt = "Create a full 360-degree rotation around the house with smooth camera movement [BGM: epic_cinematic]"
        params = extract_continuous_motion_parameters(prompt)
        
        self.assertEqual(params["rotation_yaw_deg"], 360.0)
        self.assertEqual(params["speed_profile"], "smooth_ease")

        # Test counter-clockwise rotation
        ccw_prompt = "Rotate 360 degrees counter-clockwise around the subject"
        ccw_params = extract_continuous_motion_parameters(ccw_prompt)
        self.assertEqual(ccw_params["rotation_yaw_deg"], -360.0)

    def test_02_continuous_motion_parameter_extraction_high_speed_action(self):
        """Test extraction of high-speed action sequence parameters and directional blur"""
        prompt = "High-speed action sequence with rapid zoom-in and dramatic camera whip pan ⚡ [BGM: synthwave_chase]"
        params = extract_continuous_motion_parameters(prompt)

        self.assertEqual(params["speed_profile"], "high_speed_action")
        self.assertGreaterEqual(params["action_intensity"], 0.8)
        self.assertGreater(params["motion_blur_strength"], 0.5)
        self.assertTrue(params["chromatic_pulse"])

    def test_03_temporal_easing_profiles(self):
        """Test mathematical easing functions for high-speed action, bullet-time, and smooth ease"""
        # Smooth ease endpoints
        self.assertAlmostEqual(DynamicCameraMotionSynthesizer.compute_temporal_easing(0.0, "smooth_ease"), 0.0)
        self.assertAlmostEqual(DynamicCameraMotionSynthesizer.compute_temporal_easing(1.0, "smooth_ease"), 1.0)
        self.assertAlmostEqual(DynamicCameraMotionSynthesizer.compute_temporal_easing(0.5, "smooth_ease"), 0.5)

        # High-speed action has steep acceleration in midpoint
        action_ease = DynamicCameraMotionSynthesizer.compute_temporal_easing(0.5, "high_speed_action")
        self.assertAlmostEqual(action_ease, 0.5)
        self.assertLess(DynamicCameraMotionSynthesizer.compute_temporal_easing(0.2, "high_speed_action"), 0.1)

        # Bullet-time has slow-motion plateau in the middle
        bt_start = DynamicCameraMotionSynthesizer.compute_temporal_easing(0.3, "bullet_time")
        bt_mid = DynamicCameraMotionSynthesizer.compute_temporal_easing(0.5, "bullet_time")
        bt_end = DynamicCameraMotionSynthesizer.compute_temporal_easing(0.7, "bullet_time")
        self.assertTrue(0.35 <= bt_start <= bt_mid <= bt_end <= 0.65)

    def test_04_synthesize_360_degree_rotation_video(self):
        """Test complete 360-degree rotation video rendering with HD H.264 MP4 output"""
        test_out = os.path.join("uploads", "videos", "test_360_rotation.mp4")
        if os.path.exists(test_out):
            try:
                os.remove(test_out)
            except Exception:
                pass

        sample_img = np.zeros((720, 1280, 3), dtype=np.uint8)
        # Add visual textures to verify sharp spatial rendering
        for y in range(720):
            sample_img[y, :, 0] = int(20 + 30 * (y / 720))
            sample_img[y, :, 1] = int(40 + 60 * (y / 720))
            sample_img[y, :, 2] = int(80 + 100 * (y / 720))
        # Draw central architectural house box
        cv2.rectangle(sample_img, (500, 300), (780, 560), (220, 180, 120), -1)
        cv2.circle(sample_img, (640, 360), 40, (255, 255, 255), -1)

        prompt_360 = "Full 360-degree rotation orbit around the house with volumetric light sweep [BGM: ambient_360]"
        result = video_processor.generate_image_to_video(
            image_input=sample_img,
            output_path=test_out,
            prompt=prompt_360,
            duration=1.5,
            fps=20,
            target_width=1280,
            target_height=720
        )

        self.assertEqual(result["status"], "success")
        self.assertEqual(result["parameters"]["rotation_yaw_deg"], 360.0)
        self.assertTrue(os.path.exists(test_out))
        self.assertGreater(os.path.getsize(test_out), 5000)

        # Inspect generated video frames
        cap = cv2.VideoCapture(test_out)
        self.assertTrue(cap.isOpened(), "Generated MP4 cannot be opened")
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        self.assertGreater(frame_count, 10)
        ret, first_frame = cap.read()
        self.assertTrue(ret)
        self.assertEqual(first_frame.shape[0], 720)
        self.assertEqual(first_frame.shape[1], 1280)
        cap.release()

    def test_05_synthesize_high_speed_action_sequence(self):
        """Test high-speed action sequence rendering with directional velocity motion blur"""
        test_out = os.path.join("uploads", "videos", "test_high_speed_action.mp4")
        if os.path.exists(test_out):
            try:
                os.remove(test_out)
            except Exception:
                pass

        sample_img = np.zeros((720, 1280, 3), dtype=np.uint8)
        sample_img[200:500, 400:880] = [180, 90, 40]

        prompt_action = "High-speed action sequence with rapid whip pan and motion blur ⚡ [BGM: fast_beat]"
        result = video_processor.generate_image_to_video(
            image_input=sample_img,
            output_path=test_out,
            prompt=prompt_action,
            duration=1.0,
            fps=20,
            target_width=1280,
            target_height=720
        )

        self.assertEqual(result["status"], "success")
        self.assertEqual(result["parameters"]["speed_profile"], "high_speed_action")
        self.assertTrue(os.path.exists(test_out))
        self.assertGreater(os.path.getsize(test_out), 4000)

    def test_06_langgraph_clarification_for_underspecified_prompt(self):
        """Test LangGraph asks targeted clarifying questions when prompt is underspecified"""
        session_id = "test_clarify_session"
        vague_prompt = "Make a photo into video"

        turn = chat_orchestrator.process_turn(
            user_input=vague_prompt,
            session_id=session_id,
            media_type="image"
        )

        self.assertTrue(turn["needs_clarification"])
        self.assertFalse(turn["execution_ready"])
        self.assertGreaterEqual(len(turn["clarifying_questions"]), 2)
        self.assertIn("Camera Trajectory", turn["clarifying_questions"][0]["category"])
        self.assertIn("360-Degree", turn["clarifying_questions"][0]["options"][0])

    def test_07_langgraph_immediate_execution_for_specific_complex_prompt(self):
        """Test LangGraph parses complex 360-degree high-speed prompt and compiles execution payload directly"""
        session_id = "test_direct_exec_session"
        specific_prompt = "Perform a 360-degree rotation high-speed action sequence around the house with living stars ✨ [BGM: epic_trailer]"

        turn = chat_orchestrator.process_turn(
            user_input=specific_prompt,
            session_id=session_id,
            media_type="image"
        )

        self.assertFalse(turn["needs_clarification"])
        self.assertTrue(turn["execution_ready"])
        self.assertIsNotNone(turn["execution_payload"])
        payload = turn["execution_payload"]
        self.assertEqual(payload["bgm"], "epic_trailer")
        self.assertEqual(payload["parameters"]["rotation_yaw_deg"], 360.0)
        self.assertEqual(payload["parameters"]["speed_profile"], "high_speed_action")
        self.assertTrue(payload["parameters"]["living_stars"])

    def test_08_cross_workspace_session_memory_persistence(self):
        """Test multi-turn session memory retains context across turns and workspaces"""
        session_id = "test_memory_session_99"
        
        # Turn 1: Initial image specification
        chat_orchestrator.process_turn(
            user_input="Set up 360-degree rotation with living ocean waves 🌊",
            session_id=session_id,
            media_type="image",
            workspace="image_editor",
            thumbnail_url="/uploads/images/villa.png"
        )

        # Verify memory stored
        self.assertIn(session_id, SESSION_MEMORY_STORE)
        stored_turn1 = SESSION_MEMORY_STORE[session_id]
        self.assertEqual(stored_turn1["extracted_parameters"]["rotation_yaw_deg"], 360.0)
        self.assertTrue(stored_turn1["extracted_parameters"]["living_water"])
        self.assertEqual(stored_turn1["workspace"], "image_editor")

        # Turn 2: Follow-up refinement in video workspace
        turn2 = chat_orchestrator.process_turn(
            user_input="Change pacing to high-speed action 2.0s [BGM: cinematic_electronic]",
            session_id=session_id,
            media_type="video",
            workspace="video_timeline"
        )

        self.assertTrue(turn2["execution_ready"])
        stored_turn2 = SESSION_MEMORY_STORE[session_id]
        self.assertEqual(stored_turn2["extracted_parameters"]["speed_profile"], "high_speed_action")
        self.assertEqual(stored_turn2["extracted_parameters"]["duration"], 2.0)
        self.assertEqual(stored_turn2["extracted_parameters"]["bgm"], "cinematic_electronic")


if __name__ == "__main__":
    unittest.main()
