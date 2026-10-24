'''Format and limit tests for the profile image pipeline (#752).'''
import io

import pytest
from PIL import Image

import login.profile_image as profile_image
from login.profile_image import ImageTooLarge, UnsupportedImage, renderProfilePng


ACCEPTED_FORMATS = ('PNG', 'JPEG', 'GIF', 'WEBP', 'BMP', 'TIFF', 'AVIF')


def encode(fmt, size=(300, 200), mode='RGB', **save_kwargs):
    buf = io.BytesIO()
    Image.new(mode, size).save(buf, fmt, **save_kwargs)
    return buf.getvalue()


@pytest.mark.parametrize('fmt', ACCEPTED_FORMATS)
def test_accepted_format_becomes_128_png(fmt):
    png = renderProfilePng(io.BytesIO(encode(fmt)))
    out = Image.open(io.BytesIO(png))
    assert out.format == 'PNG'
    assert out.mode == 'RGB'
    assert out.size == (128, 128)


def test_mpo_is_treated_as_jpeg_family():
    first = Image.new('RGB', (300, 200))
    second = Image.new('RGB', (300, 200))
    buf = io.BytesIO()
    first.save(buf, 'MPO', save_all=True, append_images=[second])
    png = renderProfilePng(io.BytesIO(buf.getvalue()))
    out = Image.open(io.BytesIO(png))
    assert out.format == 'PNG'
    assert out.size == (128, 128)


@pytest.mark.parametrize('fmt', ['JPEG2000', 'PDF'])
def test_disallowed_format_is_rejected(fmt):
    with pytest.raises(UnsupportedImage):
        renderProfilePng(io.BytesIO(encode(fmt, size=(20, 20))))


def test_unreadable_data_is_rejected():
    with pytest.raises(UnsupportedImage):
        renderProfilePng(io.BytesIO(b'not an image'))


def test_pixel_cap_is_enforced(monkeypatch):
    monkeypatch.setattr(profile_image, 'MAX_PIXELS', 100)
    with pytest.raises(ImageTooLarge):
        renderProfilePng(io.BytesIO(encode('PNG', size=(20, 20))))


def test_decompression_bomb_is_reported_as_too_large(monkeypatch):
    monkeypatch.setattr(Image, 'MAX_IMAGE_PIXELS', 10)
    with pytest.raises(ImageTooLarge):
        renderProfilePng(io.BytesIO(encode('PNG', size=(20, 20))))
