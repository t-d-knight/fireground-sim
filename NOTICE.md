# Data and attribution

- **Map data** (roads, water, creeks, woodland, powerlines, residential areas): (c) OpenStreetMap contributors, licensed under the Open Database Licence (ODbL). https://www.openstreetmap.org/copyright
- **Mains and hydrants** are not real data. The sim assumes mains along roads in built-up areas (see the Assumptions tab). Real hydrant positions, digitised from Coliban Water and VICMAP map images, are kept out of this repository. If you have a licensed layer, put it in `data/hydrants.local.json` (git-ignored; keys `fps`, `m`, `g`, `e`, each a list of [x, y] metres from the map origin) and it will replace the assumed points at build time.
- **Fire behaviour** uses published grassland models. Sources and every assumption are listed in the Assumptions tab inside the sim.

This is a training simulation. It is not an operational tool and must not be used to make real firefighting decisions.
