from setuptools import setup

setup(
  name='lexicon',
  packages=['lexicon'],
  include_package_data=True,
  install_requires=[
    'flask', 'mysqlclient'
  ]
  )
