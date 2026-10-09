import type { Timeline } from '../../shared/types';

/**
 * Things worth a closer look. Looking at one zooms in and shows a name, one short line, and a
 * faint hint that fades in. Hints point the player toward their partner, never at an answer:
 * every puzzle still needs both players talking.
 */
export interface InspectText {
  name: string;
  line: string;
  hint?: string;
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
        hint: 'The hands can be moved. Someone may know where they belong.',
      },
      present: {
        name: 'Grandfather clock',
        line: 'Stopped. The hands haven’t moved in years.',
        hint: 'Describe exactly where each hand points.',
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
        hint: 'Whoever answers is listening. Talk to them.',
        sound: 'static',
      },
      present: {
        name: 'Walkie-talkie',
        line: 'Your old toy. It shouldn’t work. It hisses.',
        hint: 'Someone is on the other end. Talk to them.',
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
        hint: 'Listen to where she stops.',
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
        hint: 'Remember the order they hang in.',
      },
      present: {
        name: 'Photograph',
        line: 'Faded. Mum and Dad.',
        hint: 'Does the wall still look the way it used to?',
      },
    },
  },
  'photo-2': {
    distance: 0.6,
    text: {
      '1994': {
        name: 'Photograph',
        line: 'Nora and Sam at the lake.',
        hint: 'Remember who is in it.',
      },
      present: {
        name: 'Photograph',
        line: 'Water got in. Only a boy is left in it.',
        hint: 'Ask who else should be there.',
      },
    },
  },
  'photo-3': {
    distance: 0.6,
    text: {
      '1994': {
        name: 'Photograph',
        line: 'All four of them on the porch.',
        hint: 'Count the faces.',
      },
      present: {
        name: 'Photograph',
        line: 'Four on the porch. One face is scratched out.',
        hint: 'Whose face was it?',
      },
    },
  },
  'photo-4': {
    distance: 0.55,
    text: {
      '1994': {
        name: 'Photograph',
        line: 'Sam, grinning, with his walkie-talkie.',
      },
      present: {
        name: 'Photograph',
        line: 'Hanging crooked. Someone took it down once.',
      },
    },
  },
  'drawing-stairs': {
    distance: 0.6,
    text: {
      '1994': {
        name: 'Sam’s drawing',
        line: 'A girl in red going down the stairs.',
        hint: 'Why did he colour the door so dark?',
      },
      present: {
        name: 'Your drawing',
        line: 'Soft with damp. More blue than you remember.',
        hint: 'You drew this. When?',
      },
    },
  },
  'cookie-jar': {
    distance: 0.5,
    text: {
      '1994': {
        name: 'Cookie jar',
        line: 'Where Dad keeps what he doesn’t want found.',
        hint: 'Hiding places matter in this house.',
      },
      present: {
        name: 'Cookie jar',
        line: 'Dust inside. Nothing else.',
        hint: 'Who used to hide things here?',
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
        hint: 'Count them. Remember the number.',
      },
    },
  },
  'dining-table': {
    distance: 1.8,
    text: {
      present: {
        name: 'Dining table',
        line: 'A dust sheet. Fewer chairs than there should be.',
        hint: 'How many sat here, back then?',
      },
    },
  },
  tv: {
    distance: 1.1,
    text: {
      '1994': {
        name: 'Television',
        line: 'Storm warnings, then a late film.',
        hint: 'Home videos play here too.',
      },
      present: {
        name: 'Television',
        line: 'Dead. A tape is still in the player.',
        hint: 'Old tapes remember what people won’t.',
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
        hint: 'Sam learned songs by colour.',
      },
      present: {
        name: 'Piano',
        line: 'Under the sheet, the stickers are still on the keys.',
        hint: 'Someone could tell you which colours to play.',
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
        hint: 'Read the colours to someone with a piano.',
      },
    },
  },
  valves: {
    distance: 2.7,
    text: {
      '1994': {
        name: 'Valves',
        line: 'Four wheels, four colours. Pipes vanish into the wall.',
        hint: 'You can’t see where they go. Someone else might.',
      },
      present: {
        name: 'Valves',
        line: 'The pipes are bare now. You can follow every one.',
        hint: 'She would need to know which colour comes first.',
      },
    },
  },
};
