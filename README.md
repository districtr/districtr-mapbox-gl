# Districtr Mapbox GL Component Library

License: MIT

## Introduction

Districtr is the open-source web app that empowers all people to draw districting plans. This is the Districtr Mapbox React Component which powers the maps and drawing tools on the Districtr site.

### Related Districtr Projects

This platform is part of a suite of programs that create Districtr.org.

- [districtr-cms](https://github.com/districtr/districtr-cms): A Wagtail CMS and API that manage the pages and data on the Districtr site..
- [districtr-site](https://github.com/districtr/districtr-site): The Districtr site built on Gatsby
- Other Districtr and MGGG data tools

### Contributing

This suite is under active development and will eventually replace the existing Districtr repository behind [Districtr.org](https://districtr.org).

You can develop this project independently or along with other Districtr projects. If you are interested in contributing, thank you! You can visit the Github Project for the Districtr Reboot and see if there any of our open issues or milestones that you feel you could help with. You can also send an email to engineering@mggg.org to learn more about opportunities with Districtr and MGGG.

## Getting Started

Requires:

- mapbox-gl > 2.11.0
- A Mapbox Account and API Key
- React >=16.8.0

1. Install Districtr in your project

```
npm install districtr-mapbox-gl
```

2. Import Districtr and Districtr CSS into your project.

```TSX
import React from "react";
import { Districtr } from "districtr-mapbox-gl"
import "districtr-mapbox-gl/build/districtr-mapbox-gl.css"

```

3. Configure Districtr

```TSX
import React from "react";
import { Districtr } from "districtr-mapbox-gl"
import "districtr-mapbox-gl/build/districtr-mapbox-gl.css"

const App = () => {

  const initialViewState = {
    longitude: -95.0,
    latitude: 36.5,
    zoom: 5,
    bearing: 0,
    pitch: 0,
    padding: { top: 20, bottom: 20, left: 20, right: 20 },
    fitBoundsOptions: { padding: 20 },
  }

  const sources = [
    {
      id: "counties",
      config: {
        type: "geojson",
        data: "/data/national/national-county-pl-5m.geojson",
        generateId: true,
      },
    },
  ]

  const layers = [
    {
      name: "U.S. County Borders Interactive Layer",
      interactive: true,
      config: {
        id: "counties-draw",
        source: "counties",
        type: "fill",
        layout: {
          visibility: "visible",
        },
      },
    },
    {
      name: "U.S. County Borders",
      interactive: false,
      config: {
        id: "counties-borders",
        source: "counties",
        type: "line",
        layout: {
          visibility: "visible",
        },
        paint: {
          "line-color": "#777777",
          "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0, 7, 1],
          "line-opacity": 0.8,
        },
      },
    },
    {
      name: "U.S. County Names",
      interactive: false,
      config: {
        id: "counties-labels",
        source: "counties",
        type: "symbol",
        layout: {
          visibility: "none",
          "text-field": ["format", ["get", "basename"], { "font-scale": 0.8 }],
        },
        paint: {
          "text-halo-color": "#ffffff",
          "text-halo-width": 2,
          "text-halo-blur": 1,
        },
      },
    },
  ]

  const columnSets = {
    'counties-draw': {
      geometryKey: 'GEOID',
      columnSets: [
        {
          name: 'Population',
          type: 'population',
          total: {
            key: 'POP100',
            max: 10014009,
            min: 64,
            sum: 331449281,
            name: 'Total Population'
          }
        }
      ]
    }
  }

  return (
    <div>
      <Districtr
        title="Draw 50 States"
        mapboxAccessToken={env.MAPBOX_ACCESS_KEY}
        initialViewState={initialViewState}
        sources={sources}
        layers={layers}
        unitCount={50}
        totalMembers={50}
        unitName="State"
        unitNamePlural="States"
        interactiveLayerIds={["counties-draw"]}
        unitType="single" // will be removed
        columnSets={columnSets} // legecy ColumnSets that will be updated.
        />
    </div>
  )
};

export default App;
```

## Development

This library uses:

- [Rollup](https://github.com/rollup/rollup)
- [TypeScript](https://www.typescriptlang.org/)
- [Storybook](https://storybook.js.org/)
- [Jest](https://jestjs.io/) and [React Testing Library](https://github.com/testing-library/react-testing-library)

### Loading Test Data

TBD

### Testing

```
npm run test
```

### Building

```
npm run build
```

### Storybook

To run a live-reload Storybook server on your local machine:

```
npm run storybook
```

To export your Storybook as static files:

```
npm run storybook:export
```

### Generating New Components

```
npm run generate YourComponentName
```

This will generate:

```
/src
  /YourComponentName
    YourComponentName.tsx
    YourComponentName.stories.tsx
    YourComponentName.test.tsx
    YourComponentName.types.ts
    YourComponentName.css
```
