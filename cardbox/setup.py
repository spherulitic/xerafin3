from setuptools import setup

setup(
  name='cardbox',
  packages=['cardbox'],
  include_package_data=True,
  install_requires=[
    'flask', 'mysqlclient'
  ]
  )
