from setuptools import setup

setup(
  name='stats',
  packages=['stats'],
  include_package_data=True,
  install_requires=[
    'flask', 'mysqlclient'
  ]
  )
