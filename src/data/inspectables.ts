import type { Timeline } from '../../shared/types';

/**
 * Things worth a closer look. Looking at one zooms in and shows a name, one short line, and a
 * faint line of lore that fades in: a fragment of the family's history. Lore deepens the story
 * and lets the truth surface slowly; it never gives away a puzzle answer.
 */
export interface InspectText {
  name: string;
  line: string;
  /** A faint fragment of family history, shown after a moment. */
  lore?: string;
  /** A sound the object makes when you lean in. */
  sound?: 'message' | 'static';
}

export interface Inspectable {
  /** Frame it from in front (default) or from above (things lying on a table). */
  view?: 'front' | 'top';
  /** Camera distance in metres; otherwise derived from the object's size. */
  distance?: number;
  /** Look at this height above the object's base instead of its middle. */
  focusY?: number;
  text: Partial<Record<Timeline, InspectText>>;
}

export const INSPECTABLES: Record<string, Inspectable> = {
  clock: {
    focusY: 1.78,
    distance: 0.85,
    text: {
      '1994': {
        name: 'Grandfather clock',
        line: 'Still ticking through the storm.',
        lore: 'Dad winds it every Sunday. He says a house needs a heartbeat.',
      },
      present: {
        name: 'Grandfather clock',
        line: 'Stopped. The hands haven’t moved in years.',
        lore: 'Nobody wound it after that night. Nobody wanted to.',
      },
    },
  },
  walkie: {
    view: 'top',
    distance: 0.45,
    text: {
      '1994': {
        name: 'Walkie-talkie',
        line: 'Sam’s. He made you take the other one.',
        lore: 'Channel three. Sam’s secret channel. “Only for us, okay?”',
        sound: 'static',
      },
      present: {
        name: 'Walkie-talkie',
        line: 'Your old toy. It shouldn’t work. It hisses.',
        lore: 'Channel three. You’d forgotten. Your hand hadn’t.',
        sound: 'static',
      },
    },
  },
  'answering-machine': {
    distance: 0.6,
    text: {
      present: {
        name: 'Answering machine',
        line: 'Mum’s. One message, never erased.',
        lore: 'The tape is worn thin in one place. She replayed it.',
        sound: 'message',
      },
    },
  },
  'photo-1': {
    distance: 0.6,
    text: {
      '1994': {
        name: 'Photograph',
        line: 'Mum and Dad, younger, laughing.',
        lore: 'The summer before Sam was born. Nobody looks tired yet.',
      },
      present: {
        name: 'Photograph',
        line: 'Faded. Mum and Dad.',
        lore: 'In her last years, Mum kept this one facing the wall.',
      },
    },
  },
  'photo-2': {
    distance: 0.6,
    text: {
      '1994': {
        name: 'Photograph',
        line: 'Nora and Sam at the lake.',
        lore: 'Nora taught him to float that day. He wouldn’t let go.',
      },
      present: {
        name: 'Photograph',
        line: 'Water got in. Only a boy is left in it.',
        lore: 'Of all things, it was water that got into it.',
      },
    },
  },
  'photo-3': {
    distance: 0.6,
    text: {
      '1994': {
        name: 'Photograph',
        line: 'All four of them on the porch.',
        lore: 'Dad set the timer and ran. He almost made it.',
      },
      present: {
        name: 'Photograph',
        line: 'Four on the porch. One face is scratched out.',
        lore: 'The scratches are careful. Someone took their time.',
      },
    },
  },
  'photo-4': {
    distance: 0.55,
    text: {
      '1994': {
        name: 'Photograph',
        line: 'Sam, grinning, with his walkie-talkie.',
        lore: 'He wouldn’t put the walkie-talkie down for a week.',
      },
      present: {
        name: 'Photograph',
        line: 'Hanging crooked. Someone took it down once.',
        lore: 'Taken down and hung back crooked. More than once.',
      },
    },
  },
  'drawing-stairs': {
    distance: 0.6,
    text: {
      '1994': {
        name: 'Sam’s drawing',
        line: 'A girl in red going down the stairs.',
        lore: 'He draws the stairs a lot lately. Always going down.',
      },
      present: {
        name: 'Your drawing',
        line: 'Soft with damp. More blue than you remember.',
        lore: 'You don’t remember drawing it. Mum kept it anyway.',
      },
    },
  },
  'cookie-jar': {
    distance: 0.5,
    text: {
      '1994': {
        name: 'Cookie jar',
        line: 'Where Dad keeps what he doesn’t want found.',
        lore: 'Dad hides his keys in here. Everyone knows. Nobody says.',
      },
      present: {
        name: 'Cookie jar',
        line: 'Dust inside. Nothing else.',
        lore: 'Empty for years. It still smells faintly of cinnamon.',
      },
    },
  },
  breadbin: {
    distance: 0.7,
    text: {
      '1994': {
        name: 'Bread bin',
        line: 'Stale crusts and crumbs.',
        lore: 'Mum bakes when she can’t sleep. She hasn’t baked in weeks.',
      },
    },
  },
  plates: {
    view: 'top',
    distance: 2.2,
    text: {
      '1994': {
        name: 'Dinner',
        line: 'Four places set. It went cold.',
        lore: 'Mum always sets four. Even when someone is late.',
      },
    },
  },
  'dining-table': {
    distance: 1.8,
    text: {
      present: {
        name: 'Dining table',
        line: 'A dust sheet. Fewer chairs than there should be.',
        lore: 'Three chairs under the sheet. Mum gave the fourth away.',
      },
    },
  },
  tv: {
    distance: 1.1,
    text: {
      '1994': {
        name: 'Television',
        line: 'Storm warnings, then a late film.',
        lore: 'Storm warnings on every channel. Dad keeps turning it up.',
      },
      present: {
        name: 'Television',
        line: 'Dead. A tape is still in the player.',
        lore: 'There’s still a tape inside. Someone stopped it halfway.',
      },
    },
  },
  piano: {
    distance: 2.4,
    focusY: 0.9,
    text: {
      '1994': {
        name: 'Piano',
        line: 'Little coloured stickers on the keys.',
        lore: 'Sam can only play one song. You taught him.',
      },
      present: {
        name: 'Piano',
        line: 'Under the sheet, the stickers are still on the keys.',
        lore: 'Mum never played again. She never sold it, either.',
      },
    },
  },
  'music-box': {
    distance: 0.6,
    focusY: 0.1,
    text: {
      '1994': {
        name: 'Music box',
        line: 'Yours. Coloured marks around the drum.',
        lore: 'Grandma’s. It plays the song you hum him to sleep with.',
      },
    },
  },
  valves: {
    distance: 2.7,
    text: {
      '1994': {
        name: 'Valves',
        line: 'Four wheels, four colours. Pipes vanish into the wall.',
        lore: 'Dad says never touch them. The basement floods every spring.',
      },
      present: {
        name: 'Valves',
        line: 'The pipes are bare now. You can follow every one.',
        lore: 'Drained for years now. The tide line is still on the wall.',
      },
    },
  },
};
