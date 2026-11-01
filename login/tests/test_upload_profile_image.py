'''HTTP-level tests for the profile image upload endpoint (#752).'''
import io
import stat

import pytest
from PIL import Image

import login.profile_image as profile_image
from login import views

from helpers import ACCEPTED_FORMATS, TEST_UUID, encode, encode_mpo


PNG_SIGNATURE = b'\x89PNG\r\n\x1a\n'


def post_image(client, data, filename='photo.png'):
    return client.post(
        '/uploadProfileImage',
        data={'file': (io.BytesIO(data), filename)},
        content_type='multipart/form-data',
    )


def saved_photo(photo_dir):
    return photo_dir / f'{TEST_UUID}.png'


@pytest.mark.parametrize('fmt', ACCEPTED_FORMATS)
def test_upload_accepts_format_and_stores_png(client, photo_dir, keycloak, fmt):
    response = post_image(client, encode(fmt), filename=f'photo.{fmt.lower()}')

    expected = f'images/users/{TEST_UUID}.png'
    assert response.status_code == 200
    assert response.get_json() == {'status': 'success', 'photo': expected}
    assert keycloak == [{'photo': expected}]

    assert [p.name for p in photo_dir.iterdir()] == [f'{TEST_UUID}.png']
    saved = saved_photo(photo_dir)
    assert stat.S_IMODE(saved.stat().st_mode) == 0o644
    with Image.open(saved) as img:
        assert img.format == 'PNG'
        assert img.mode == 'RGB'
        assert img.size == (128, 128)


def test_upload_accepts_mpo(client, photo_dir, keycloak):
    response = post_image(client, encode_mpo(), filename='photo.jpg')

    assert response.status_code == 200
    assert response.get_json()['photo'] == f'images/users/{TEST_UUID}.png'
    with Image.open(saved_photo(photo_dir)) as img:
        assert img.format == 'PNG'


def test_upload_trusts_content_not_filename(client, photo_dir, keycloak):
    '''A JPEG named photo.png must be decoded as a JPEG, then stored as PNG.'''
    response = post_image(client, encode('JPEG'), filename='photo.png')

    assert response.status_code == 200
    assert [p.name for p in photo_dir.iterdir()] == [f'{TEST_UUID}.png']
    assert saved_photo(photo_dir).read_bytes().startswith(PNG_SIGNATURE)


@pytest.mark.parametrize('fmt', ['JPEG2000', 'PDF'])
def test_upload_rejects_disallowed_content_even_with_png_name(
        client, photo_dir, keycloak, fmt):
    response = post_image(client, encode(fmt, size=(20, 20)), filename='photo.png')

    assert response.status_code == 415
    assert 'error' in response.get_json()
    assert list(photo_dir.iterdir()) == []
    assert keycloak == []


def test_upload_rejects_garbage(client, photo_dir, keycloak):
    response = post_image(client, b'not an image')

    assert response.status_code == 415
    assert list(photo_dir.iterdir()) == []
    assert keycloak == []


def test_upload_requires_a_file(client, keycloak):
    response = client.post('/uploadProfileImage', data={})

    assert response.status_code == 400
    assert keycloak == []


def test_upload_requires_a_filename(client, keycloak):
    response = client.post(
        '/uploadProfileImage',
        data={'file': (io.BytesIO(b'x'), '')},
        content_type='multipart/form-data',
    )

    assert response.status_code == 400
    assert keycloak == []


def test_upload_rejects_oversized_image(client, photo_dir, keycloak, monkeypatch):
    monkeypatch.setattr(profile_image, 'MAX_PIXELS', 100)

    response = post_image(client, encode('PNG', size=(20, 20)))

    assert response.status_code == 413
    assert list(photo_dir.iterdir()) == []
    assert keycloak == []


def test_upload_replaces_existing_photo(client, photo_dir, keycloak):
    existing = saved_photo(photo_dir)
    existing.write_bytes(b'old photo')

    response = post_image(client, encode('JPEG'))

    assert response.status_code == 200
    assert existing.read_bytes().startswith(PNG_SIGNATURE)
    assert [p.name for p in photo_dir.iterdir()] == [f'{TEST_UUID}.png']


def test_upload_save_failure_is_a_logged_server_error(
        client, tmp_path, keycloak, monkeypatch, caplog):
    not_a_dir = tmp_path / 'photos'
    not_a_dir.write_text('this is a file, not a directory', encoding='utf-8')
    monkeypatch.setattr(views, 'USER_PHOTO_DIR', str(not_a_dir))

    response = post_image(client, encode('PNG'))

    assert response.status_code == 500
    assert response.get_json() == {'error': 'Could not save image'}
    assert keycloak == []
    assert 'Failed to save profile image' in caplog.text
