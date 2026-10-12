<picture>
  <source media="(prefers-color-scheme: dark)" srcset="../../.github/assets/home-assistant-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="../../.github/assets/home-assistant-light.svg">
  <img alt="Home Assistant for FlexDeck: any entity's state on a key, a sensor's reading or a light on or off" src="../../.github/assets/home-assistant-dark.svg" width="100%">
</picture>

<p align="center">
  <a href="https://github.com/Questory-Labs/FlexDeck-Plugins/releases?q=home-assistant-v&expanded=true"><img alt="Release" src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FQuestory-Labs%2FFlexDeck-Plugins%2Fmain%2Frecipes%2Fhome-assistant%2Fplugin.json&query=%24.version&prefix=v&label=release&style=flat-square&color=ff5a1f&labelColor=111113"></a>
  <img alt="Runtime: recipe" src="https://img.shields.io/badge/runtime-recipe-ecebe6?style=flat-square&labelColor=111113">
  <img alt="Permissions: network" src="https://img.shields.io/badge/permissions-network-ecebe6?style=flat-square&labelColor=111113">
  <img alt="Home Assistant" src="https://img.shields.io/badge/works%20with-Home%20Assistant-ecebe6?style=flat-square&labelColor=111113&logo=homeassistant&logoColor=white">
</p>

<p align="center">
  Any <a href="https://www.home-assistant.io">Home Assistant</a> entity's state on a key: the living room's temperature,<br>
  the door, the solar panels. <b>A light's key glows amber while it's on.</b> Straight from your network.
</p>

<br>

## Set up

About two minutes, once per Home Assistant.

### 1. Make an access token

1. In Home Assistant, click your name at the bottom left to open your **Profile**, and open the **Security** tab.
2. Scroll to **Long-lived access tokens** and press **Create token**. Name it `FlexDeck`.
3. Copy the token. Home Assistant shows it **only once**.

### 2. Add the key

1. Install **Home Assistant** from the Marketplace, and add the **Home Assistant** key (1 × 1) from the key gallery.
2. Select it, and under **Its own data**, set:

   | | |
   | --- | --- |
   | *url* | Your Home Assistant's address, as you open it in a browser. Default `http://homeassistant.local:8123` |
   | *token* | The token from step 1. It's kept as a secret on this PC |
   | *entity* | The entity's id, for example `sensor.living_room_temperature` |

FlexDeck only lets a web source reach your own network when the source allows it. This one does, with **May reach my network** already on, so there's nothing to switch.

> [!TIP]
> **Finding an entity's id:** in Home Assistant, open **Settings → Devices & services → Entities**, click the entity, and open its settings (the gear). The **Entity ID** is there, like `light.desk_lamp` or `binary_sensor.front_door`.

One key per entity: add as many as you like, each with its own *entity*. They can share the same token.

## What it shows

| Field | Read as | |
| --- | --- | --- |
| `state` | `{{this.state}}` | The state: `21.5`, `on`, `off`, `open`, `home`… |
| `unit` | `{{this.unit}}` | Its unit, if it has one: `°C`, `%`, `W` |
| `name` | `{{this.name}}` | Its friendly name, or its id if it has none |
| `on` | `this.on` | Whether the state is `on`, for a key's look |

It refreshes every 30 seconds. The key shows the name on top, the state and unit in the middle, and glows amber while `on` is true.

## Troubleshooting

<details>
<summary><b>"… is on this computer or your network; turn on "May reach my network" to allow it"</b></summary>

FlexDeck keeps web sources away from your own network unless they allow it. This recipe allows it out of the box, so the switch has been turned off: open the Home Assistant source in the editor's data sources and turn **May reach my network** back on.
</details>

<details>
<summary><b>"homeassistant.local could not be found"</b></summary>

Your network doesn't resolve `.local` names for this PC. Use Home Assistant's IP address instead, for example `http://192.168.1.50:8123`. Your router's device list, or **Settings → System → Network** in Home Assistant, shows it.
</details>

<details>
<summary><b>The key shows "401" or nothing at all</b></summary>

The token is wrong, or was deleted. Make a new one ([step 1](#1-make-an-access-token)) and paste it into *token*.
</details>

<details>
<summary><b>The state is blank, or "404"</b></summary>

The *entity* id has a typo. Copy it from Home Assistant as described above.
</details>

<details>
<summary><b>Using Nabu Casa or a public address?</b></summary>

That works too: put your `https://…ui.nabu.casa` address in *url*. A public address doesn't need *May reach my network*.
</details>

---

<sub>A recipe is a plugin with no code: [`recipe.json`](recipe.json) describes the web source and the key that shows it. It reads states, and doesn't switch anything. It only asks Home Assistant's REST API for the one entity you name.</sub>
