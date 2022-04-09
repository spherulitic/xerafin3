from setuptools import setup

setup(
  name='login',
  packages=['login'],
  include_package_data=True,
  install_requires=[
    'flask', 'bcrypt', 'mysqlclient'
  ]
  )
