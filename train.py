"""CLI shim for backward compatibility.

The full training implementation now lives in ``astrum_ai.training``.
"""

from astrum_ai.training import train_cli


def main() -> None:
    train_cli()


if __name__ == "__main__":
    main()
