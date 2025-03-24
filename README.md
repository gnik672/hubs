# Hubs Client

## Overview

The Hubs client contains all modifications to the source code of the Hubs Foundation Hubs repo.

## Table of Contents

- [Environments](#environments)
- [Hubs Services](#hubs-services)
- [Project Structure](#project-structure)
- [Technologies](#technologies)
- [Deployments](#deployments)
- [Integration with External APIs](#integration-with-external-apis)

## Environments

- Development

For development, a [Hubs Compose](https://github.com/Hubs-Foundation/hubs-compose.git) project is deployed to a VM. For more information about installing, initializing, updating, and stopping the services, read the documentation of this project.

- Production

For production, a [Hubs Community Edition (HCE)](https://github.com/Hubs-Foundation/hubs-cloud/tree/master/community-edition) project is deployed in a [Google Kubernetes Engine](https://git.synelixis.com/voxreality/gke-vr-conference).

## Hubs Services

For the VR conference, we have forked 2 out of all the services of the HCE.

- [`Hubs-client`](https://github.com/kontopoulosdm/hubs): A frontend component where all visualization takes place. The application communicates with the backend server `Reticulum` and the WebRTC server for audio and video communication `Dialog`.

- [`Dialog`](https://github.com/kontopoulosdm/dialog): A custom WebRTC server with custom logic for networking transcription of users to all room participants. Additional features include:
  - Raise hand in the conference room for the Q&A session
  - Accept hand raise (when you are the presenter)
  - Send info about presenter info to new users

Not custom forked, but used during development:

- [`Spoke`](https://github.com/Hubs-Foundation/Spoke): A scene editor where we build the environment of each VR conference's scenes for production. To have the same result in the development project, we export the created scene in `obj` format, upload it to the `conference repo`, and manually link the file to a development room.

From scratch, we have developed two different APIs to communicate with hubs, in order to avoid modification in `Reticulum`.

- [`Conference Repo`](https://git.synelixis.com/voxreality/conference-repo): Contains info about required assets for every room and every potential user. Holds a list of allowed resources for every user in every room. Supports file serving to the application (labels, slides, etc).

- [`Vox logger`](https://git.synelixis.com/voxreality/vox-logger): Used to store information about user interactions with the application during pilots. Has integration with an S3 bucket to hold the created data.

## Project Structure

Important directories of the project include:

```
/src
├── assets
│   ├── ...
├── bit-systems
│   ├── ...
├── prefabs
│   ├── ...
├── react-components
│   ├── ...
├── systems
│   ├── ...
├── utils
│   ├── ...
│
├── hub.html
└── hub.js
```

- `Assets`: Contains all media & localization files. To update the user panel in VR mode, read the `/doc/spritesheet-generation.md` file.

- `bit-systems`: Contains all bitECS systems of the application's main loop. Significant systems constructed for the needs of the VR conference include:

  - `agent-system.js`: Virtual Agent functionality. The system is bound to the existence of an agent object (`/src/prefabs/agent.tsx`). This component communicates in sequence with multiple AI components:
    - `voice-translation` AI component
    - `intent-recognition` AI component
    - `vision-language-navigation (navVQA)` AI component
    - `dialogue-agent` AI component
    - `text-translation` AI component
  - `routing-system.ts`: System for generating the shortest path from the user's location to a requested direction. In the previous pilot, this knowledge was generated to be propagated to the `dialog-agent` and generate a human-like answer. Now this knowledge is fetched from the `navVQA` component. The system also creates visual indicators to the destination (will be used for this pilot also).
  - `translation-system.ts`: Handles audio translation. This system utilizes the changes of the `Dialog` server. In rooms where translation is permitted, the producer transcribes their audio and sends it to the server. On the receiver end, once the user collects the sent text, they translate it and render it to the panel.
  - `presentation-system.ts`: Has similar functionality to the `translation-system` but for the conference room where the main presentation will take place. Also includes methods for the Q&A session. The goal for the presenter is to utilize a `script-translation` AI component that translates text based on a predefined script.
  - `tutorial-system.ts`: A system for an introductory interactive tutorial taking place in the lobby room.
  - `help-system.ts`: A system that renders help slides for the user, accessible in every room.
  - `map-system.ts`: A system that indicates the position of the user relative to the room.
  - `room-label-system.ts`: A system that, on room entry, renders labels on the wall of the room in the user's selected language.
  - `localization-system.ts`: Holds textual info in all 5 application's languages and has relevant methods.

- `Prefabs`: Holds used 3D objects in a `tsx` format.
- `Systems`: Contains old AFRAME components. Many of those components and systems are still used inside the application, so existing solutions that need a functionality extension require code modification of the AFRAME files. These include:
  - `translate-badge`
  - `hud-controller`
  - `translate-panel`

For more info, read the [AFRAME documentation](https://aframe.io/docs/1.7.0/introduction/).

- `react-components`: Includes all React elements. Here we modified the dialog box before entering the room to include the user's language. Additionally, we have added custom icons in the bottom bar for all added features and we have added a button to give permission to users that have their hand raised (in the conference room).

- `utils`: Utility scripts such as:

  - `ml-adapters`: Functions to send requests to the AI components.
  - `room-properties`: Functions to load room properties from the conference repo API.

- `hub.html`: The root HTML page of the room.
- `hubs.js`: The root JS script of the room.

## Technologies

For a comprehensive understanding of the hubs functionality, you should check:

- [Aframe](https://aframe.io/)
- [Three.js](https://threejs.org/)
- [WebRTC](https://webrtc.org/)

## Deployments

To deploy to production, you should apply your commits to the `main` branch of the application. The repo has a `CI/CD` pipeline that builds and pushes a docker image to Syn's Docker Hub and applies a change to the GKE cluster through `flux`.

## Integration with External APIs

`Reticulum` is written in Elixir and is configured with specific `CSP` and `CORS` rules. To override them, you should apply changes to the GKE manifest file in the `custom csp rules` of its `config map`. Hubs only allows `https` connections.

External APIs include:

- AI models
- Conference repo
- Vox logger
