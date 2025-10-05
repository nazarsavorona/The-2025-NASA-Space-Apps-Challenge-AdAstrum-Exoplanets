"""CLI shim for backward compatibility.

The full inference implementation now lives in ``astrum_ai.inference``.
"""

from astrum_ai.inference import inference_cli as main


if __name__ == "__main__":
    main()
