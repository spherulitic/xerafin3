'''Decode an uploaded profile image and re-encode it as a 128x128 PNG.

Kept free of Flask/Keycloak/MySQL imports so the format and size policy can be
unit-tested without the service's request hooks.
'''
import io

from PIL import Image

MAX_PIXELS = 50_000_000  # a 128x128 thumbnail can never need a 50 MP source

# Decoders we are willing to expose. MPO is deliberately absent: Pillow's JPEG
# plugin opens MPO files, and "MPO" is not a registered plugin name. EPS
# (Ghostscript), PDF, PSD, WMF/EMF and JPEG 2000 are deliberately excluded.
_CANDIDATE_INPUT_FORMATS = ('PNG', 'JPEG', 'GIF', 'WEBP', 'BMP', 'TIFF', 'AVIF')


def _input_formats():
  # Pillow 13 registers plugins lazily, and Image.open(formats=...) raises
  # KeyError if a name is not registered, so only keep the formats this build
  # actually supports.
  Image.init()
  return tuple(f for f in _CANDIDATE_INPUT_FORMATS if f in Image.OPEN)


INPUT_FORMATS = _input_formats()


class ProfileImageError(Exception):
  '''Base class for profile image failures that are the client's fault.'''
  status = 422
  message = 'Could not process image'


class UnsupportedImage(ProfileImageError):
  status = 415
  message = 'Unsupported or unreadable image'


class ImageTooLarge(ProfileImageError):
  status = 413
  message = 'Image dimensions too large'


def renderProfilePng(stream):
  '''Return a 128x128 PNG derived from an uploaded image stream.'''
  try:
    img = Image.open(stream, formats=INPUT_FORMATS)
  except Image.DecompressionBombError as e:
    raise ImageTooLarge() from e
  except (Image.UnidentifiedImageError, OSError, SyntaxError, ValueError) as e:
    raise UnsupportedImage() from e

  if img.width * img.height > MAX_PIXELS:
    raise ImageTooLarge()

  try:
    img = img.convert('RGB')
    img.thumbnail((128, 128), Image.LANCZOS)
    canvas = Image.new('RGB', (128, 128), (0, 0, 0))
    x_offset = (128 - img.width) // 2
    y_offset = (128 - img.height) // 2
    canvas.paste(img, (x_offset, y_offset))
    out = io.BytesIO()
    canvas.save(out, 'PNG')
    return out.getvalue()
  except (OSError, SyntaxError, ValueError) as e:
    raise UnsupportedImage() from e
