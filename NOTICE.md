# Data and attribution

- **Map data** (roads, water, creeks, woodland, powerlines, residential areas): (c) OpenStreetMap contributors, licensed under the Open Database Licence (ODbL). https://www.openstreetmap.org/copyright
- **Hydrant and fireplug positions** (Marong, Maiden Gully, Eaglehawk) are not in this repository. They were digitised by hand from Coliban Water and VICMAP township map images and are loaded from a local, git-ignored file, `data/hydrants.local.json`, if present (keys `fps`, `m`, `g`, `e`, each a list of [x, y] metres from the map origin). Without it the sim builds and runs with no hydrants.
- **Fire behaviour** uses published grassland models. Sources and every assumption are listed in the Assumptions tab inside the sim.

This is a training simulation. It is not an operational tool and must not be used to make real firefighting decisions.
