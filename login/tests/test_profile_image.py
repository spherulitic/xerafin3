'''Format and limit tests for the profile image pipeline (#752).'''
import io

import pytest
from PIL import Image

import login.profile_image as profile_image
from login.profile_image import ImageTooLarge, UnsupportedImage, renderProfilePng

from helpers import ACCEPTED_FORMATS, encode, encode_mpo


@pytest.mark.parametrize('fmt', ACCEPTED_FORMATS)
def test_accepted_format_becomes_128_png(fmt):
    png = renderProfilePng(io.BytesIO(encode(fmt)))
    out = Image.open(io.BytesIO(png))
    assert out.format == 'PNG'
    assert out.mode == 'RGB'
    assert out.size == (128, 128)


def test_mpo_is_treated_as_jpeg_family():
    png = renderProfilePng(io.BytesIO(encode_mpo()))
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
