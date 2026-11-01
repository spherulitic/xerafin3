'''Image factories and constants shared by the login service tests.'''
import io

from PIL import Image

TEST_UUID = 'test-user-uuid'

ACCEPTED_FORMATS = ('PNG', 'JPEG', 'GIF', 'WEBP', 'BMP', 'TIFF', 'AVIF')


def encode(fmt, size=(300, 200), mode='RGB', **save_kwargs):
    '''Return encoded image bytes for the given Pillow format.'''
    buf = io.BytesIO()
    Image.new(mode, size).save(buf, fmt, **save_kwargs)
    return buf.getvalue()


def encode_mpo(size=(300, 200)):
    '''Return a two-frame MPO (JPEG family) image.'''
    buf = io.BytesIO()
    Image.new('RGB', size).save(
        buf, 'MPO', save_all=True, append_images=[Image.new('RGB', size)]
    )
    return buf.getvalue()
