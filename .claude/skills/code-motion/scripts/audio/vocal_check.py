#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["mlx-whisper"]
# ///
"""Vocal check with Whisper (mlx): transcribes each track; real singing gives coherent words with low
no_speech_prob, instrumental gives nothing or hallucinated filler with high no_speech_prob / repetition.
Prints the first segments (nsp = no_speech_prob, lp = avg_logprob) and a verdict.

usage: uv run --script vocal_check.py TRACK [TRACK ...] [--language en] [--model REPO]

Needs Apple Silicon (mlx) and ffmpeg in PATH. The first run downloads the model (whisper-small, about 0.5 GB)
from Hugging Face into its cache. --language is the language the lyrics are expected in (en by default):
for lyrics in another language pass its code, or the verdict may say "no vocals" for a track that sings.
"""
import argparse
import sys


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('tracks', nargs='+', metavar='TRACK', help='audio files (mp3, wav, ... anything ffmpeg reads)')
    ap.add_argument('--language', default='en', help='language code of the expected lyrics (default en)')
    ap.add_argument('--model', default='mlx-community/whisper-small-mlx', help='Hugging Face repo of an mlx Whisper model')
    ap.add_argument('--segments', type=int, default=10, help='how many segments to print per track (default 10)')
    args = ap.parse_args()
    try:
        import mlx_whisper
    except ImportError as e:
        raise SystemExit(f'mlx-whisper is not available ({e}); it needs Apple Silicon. '
                         f'Run the script with `uv run --script` so the dependency is installed.')
    for p in args.tracks:
        r = mlx_whisper.transcribe(p, path_or_hf_repo=args.model, language=args.language,
                                   condition_on_previous_text=False, verbose=None)
        segs = r['segments']
        conf = [s for s in segs if s['no_speech_prob'] < 0.5 and s['avg_logprob'] > -1.0]
        print(f"{p}: {len(segs)} segments, {len(conf)} confident -> {'VOCALS LIKELY' if conf else 'no vocals detected'}")
        for s in segs[:args.segments]:
            print(f"   {s['start']:6.1f}-{s['end']:6.1f} nsp={s['no_speech_prob']:.2f} lp={s['avg_logprob']:.2f} {s['text'][:70]!r}")
        sys.stdout.flush()


if __name__ == '__main__':
    main()
