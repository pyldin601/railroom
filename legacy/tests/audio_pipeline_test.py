"""Asset pipeline checks; the full codec/DSP check runs through --check separately."""
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("audio_pack", ROOT / "scripts/audio_pack.py")


class AudioPipelineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pipeline = importlib.util.module_from_spec(SPEC)
        SPEC.loader.exec_module(cls.pipeline)

    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="railroom-audio-test-")
        self.addCleanup(self.temporary.cleanup)
        self.pack = Path(self.temporary.name) / "pack"
        self.pack.mkdir()
        manifest = json.loads((ROOT / "public/audio/manifest.json").read_text())
        for name in ["manifest.json", *(s["url"] for s in manifest["samples"])]:
            shutil.copyfile(ROOT / "public/audio" / name, self.pack / name)

    def update_manifest(self, mutate):
        path = self.pack / "manifest.json"
        manifest = json.loads(path.read_text())
        mutate(manifest)
        path.write_text(json.dumps(manifest))

    def test_current_pack_is_valid_and_complete(self):
        manifest = self.pipeline.validate_pack(self.pack)
        self.assertEqual(len(manifest["samples"]), 12)

    def test_missing_brake_texture_rejects_install_before_any_writes(self):
        (self.pack / "brake-hiss.wav").unlink()
        destination = Path(self.temporary.name) / "installed"
        destination.mkdir()
        (destination / "manifest.json").write_text("keep approved pack")
        with self.assertRaises(ValueError):
            self.pipeline.install_pack(self.pack, destination)
        self.assertEqual((destination / "manifest.json").read_text(), "keep approved pack")
        self.assertEqual([p.name for p in destination.iterdir()], ["manifest.json"])

    def test_missing_provenance_and_escaping_asset_paths_are_rejected(self):
        self.update_manifest(lambda m: m["samples"][0].pop("license"))
        with self.assertRaises(ValueError):
            self.pipeline.validate_pack(self.pack)
        self.update_manifest(lambda m: m["samples"][0].update(license="CC0-1.0", url="../outside.wav"))
        with self.assertRaises(ValueError):
            self.pipeline.validate_pack(self.pack)

    def test_changed_audio_fails_comparison(self):
        path = self.pack / "traction-tonal.wav"
        data = bytearray(path.read_bytes())
        data[100] ^= 1
        path.write_bytes(data)
        differences = self.pipeline.compare_pack(self.pack, ROOT / "public/audio")
        self.assertEqual(differences, ["traction-tonal.wav"])

    def test_install_preserves_historical_assets(self):
        destination = Path(self.temporary.name) / "installed"
        destination.mkdir()
        (destination / "rolling-metal.wav").write_bytes(b"historical comparison")
        (self.pack / "joint-1.wav").write_bytes(b"staging-only extraction base")
        self.pipeline.install_pack(self.pack, destination)
        self.assertEqual(self.pipeline.compare_pack(self.pack, destination), [])
        self.assertEqual((destination / "rolling-metal.wav").read_bytes(), b"historical comparison")
        self.assertFalse((destination / "joint-1.wav").exists())

    def test_existing_pack_cannot_be_used_as_build_output(self):
        before = {path.name: path.read_bytes() for path in self.pack.iterdir()}
        with self.assertRaises(ValueError):
            self.pipeline.build_pack(self.pack, ffmpeg="must-not-be-invoked")
        self.assertEqual({path.name: path.read_bytes() for path in self.pack.iterdir()}, before)

    def test_truncated_wave_and_invalid_loop_are_rejected(self):
        path = self.pack / "rolling-rail.wav"
        original = path.read_bytes()
        path.write_bytes(original[:-2])
        with self.assertRaises(ValueError):
            self.pipeline.validate_pack(self.pack)
        path.write_bytes(original)
        self.update_manifest(lambda m: m["samples"][8].update(loopEnd=500))
        with self.assertRaises(ValueError):
            self.pipeline.validate_pack(self.pack)


if __name__ == "__main__":
    unittest.main()
