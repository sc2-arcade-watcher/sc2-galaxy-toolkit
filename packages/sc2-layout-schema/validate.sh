#!/bin/bash

set -e

xmllint --noout --schema dev/sc2layout-map.xsd sc2layout/*.xml
