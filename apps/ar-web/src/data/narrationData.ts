import type { NarrationSegment } from '@/types/narration'

export const narrationData: Record<string, NarrationSegment[]> = {
  'mona-lisa': [
    {
      id: 'mona-lisa-1',
      label: 'Section 1 of 6: Scene labels',
      text: 'You are looking at the Mona Lisa by Leonardo da Vinci, painted around 1503 to 1506.',
      pauseAfterMs: 800,
    },
    {
      id: 'mona-lisa-2',
      label: 'Section 2 of 6: Visual description',
      text: 'This is a half-length portrait of a woman seated against an open landscape. She gazes directly at the viewer with a subtle, enigmatic expression. Her hands are folded gently in her lap, and her face is rendered with extraordinary softness using Leonardo\'s sfumato technique — a method of blending tones so gradually that there are no harsh outlines. The background shows winding paths, water, and mountains disappearing into a misty distance.',
      pauseAfterMs: 1200,
    },
    {
      id: 'mona-lisa-3',
      label: 'Section 3 of 6: Historical context',
      text: 'Painted in Florence during the Italian High Renaissance, the Mona Lisa became globally famous for its technique, its mystery, and its remarkable journey through history. Commissioned likely by a Florentine merchant, it was acquired by King Francis the First of France and eventually displayed in the Louvre in Paris, where it has remained ever since — except for a famous two-year theft in 1911.',
      pauseAfterMs: 1200,
    },
    {
      id: 'mona-lisa-4',
      label: 'Section 4 of 6: Augmented reality experience',
      text: 'In the augmented reality overlay you are seeing now, golden particles rise slowly around the portrait, evoking the warmth of candlelight in a Renaissance studio. The particles reflect the golden tones in the painting — the amber sky, the ochre landscape — bringing that sense of timeless illumination into the space around you.',
      pauseAfterMs: 1200,
    },
    {
      id: 'mona-lisa-5',
      label: 'Section 5 of 6: The artist',
      text: 'Leonardo da Vinci was born in 1452 in Vinci, Italy, and is considered one of the greatest minds in human history — a painter, sculptor, architect, engineer, and scientist all at once. He was obsessed with understanding the natural world, filling thousands of notebook pages with anatomical drawings, studies of water flow, and observations of light. He died in France in 1519, never having returned to Italy.',
      pauseAfterMs: 1200,
    },
    {
      id: 'mona-lisa-6',
      label: 'Section 6 of 6: Fun fact',
      text: 'Here is a fascinating detail: the Mona Lisa has no visible eyebrows or eyelashes. Art historians believe Leonardo painted them originally, but they may have been removed during an overzealous cleaning centuries later. A high-resolution digital scan of the painting appears to confirm faint traces of a single eyebrow stroke — suggesting the painting we see today may look quite different from Leonardo\'s original vision.',
      pauseAfterMs: 1500,
    },
  ],

  'starry-night': [
    {
      id: 'starry-night-1',
      label: 'Section 1 of 6: Scene labels',
      text: 'You are looking at The Starry Night by Vincent van Gogh, painted in 1889.',
      pauseAfterMs: 800,
    },
    {
      id: 'starry-night-2',
      label: 'Section 2 of 6: Visual description',
      text: 'This is a night landscape showing a swirling, turbulent sky filled with luminous stars and a crescent moon over a sleeping village. The sky dominates the composition, rendered in bold, curving brushstrokes of deep blue and indigo, with spiraling clouds that seem alive with motion. In the lower right stands a tall, flame-like cypress tree — a traditional symbol of death and mourning — while the village below is calm and still, its church steeple pointing quietly upward.',
      pauseAfterMs: 1200,
    },
    {
      id: 'starry-night-3',
      label: 'Section 3 of 6: Historical context',
      text: 'Van Gogh painted this while staying voluntarily at the Saint-Paul-de-Mausole asylum in Saint-Rémy-de-Provence, France, following a mental breakdown. He painted this view from his room window, adding the village from his imagination. Despite his distress, this period was extraordinarily productive — he completed over 150 paintings in one year. The Starry Night was not among his personal favorites. It now hangs at the Museum of Modern Art in New York.',
      pauseAfterMs: 1200,
    },
    {
      id: 'starry-night-4',
      label: 'Section 4 of 6: Augmented reality experience',
      text: 'In the augmented reality experience surrounding you now, luminous particles drift and spiral upward in patterns that echo the swirling movement of Van Gogh\'s brushstrokes. Blue and gold particles orbit each other like stars being born, translating the kinetic energy of his paint into three-dimensional motion. The colors — deep navy, electric blue, and warm golden yellow — are drawn directly from the painting\'s own palette.',
      pauseAfterMs: 1200,
    },
    {
      id: 'starry-night-5',
      label: 'Section 5 of 6: The artist',
      text: 'Vincent van Gogh was born in 1853 in the Netherlands. He only began painting seriously at age 27, and his career lasted just ten years before his death in 1890 at age 37. During his lifetime he sold only one painting. He was deeply influenced by Japanese woodblock prints and by the emotional use of color in French Impressionism, developing a style so distinctive that a single brushstroke is immediately recognizable as his.',
      pauseAfterMs: 1200,
    },
    {
      id: 'starry-night-6',
      label: 'Section 6 of 6: Fun fact',
      text: 'Scientists have found that the swirling patterns Van Gogh painted in The Starry Night closely resemble the mathematical structure of turbulent fluid flow — a phenomenon not formally described until decades after his death. Physicist Werner Heisenberg once said the problem of turbulence would follow him to his grave, yet Van Gogh captured it intuitively, in oil paint, while recovering from a breakdown. The painting may be the most accurate visual representation of turbulence ever created.',
      pauseAfterMs: 1500,
    },
  ],

  'the-scream': [
    {
      id: 'the-scream-1',
      label: 'Section 1 of 6: Scene labels',
      text: 'You are looking at The Scream by Edvard Munch, created in 1893.',
      pauseAfterMs: 800,
    },
    {
      id: 'the-scream-2',
      label: 'Section 2 of 6: Visual description',
      text: 'A figure stands on a bridge or walkway, mouth open wide in what appears to be a silent scream, hands pressed to the sides of its face. The sky above is rendered in turbulent waves of red, orange, and yellow — an almost hallucinatory sunset that bleeds into the landscape. Two dark, indifferent figures walk in the distance behind. The figure in the foreground seems to dissolve into the swirling environment, as though anxiety itself is consuming both the person and the world around them.',
      pauseAfterMs: 1200,
    },
    {
      id: 'the-scream-3',
      label: 'Section 3 of 6: Historical context',
      text: 'Munch created four versions of The Scream — two paintings, a pastel, and a lithograph — between 1893 and 1910. The work is part of his Frieze of Life cycle, a series exploring love, anxiety, and death. In his diary, Munch described the moment that inspired it: he was walking with friends when the sky suddenly turned blood red at sunset, and he felt "an infinite scream passing through nature." The painting became a central reference point for Expressionism and remains one of the most recognized images in art history.',
      pauseAfterMs: 1200,
    },
    {
      id: 'the-scream-4',
      label: 'Section 4 of 6: Augmented reality experience',
      text: 'The augmented reality scene around you now renders the painting\'s anxiety in three dimensions. Particles of deep red, burnt orange, and flickering yellow swirl and pulse, mimicking the wavy distortions of Munch\'s sky. The motion is agitated and irregular — unlike the gentle drift of the Mona Lisa particles or the spiraling arcs of Starry Night — reflecting the existential tension that defines this work. The AR experience is designed to make the invisible feeling of the painting physically present around you.',
      pauseAfterMs: 1200,
    },
    {
      id: 'the-scream-5',
      label: 'Section 5 of 6: The artist',
      text: 'Edvard Munch was born in 1863 in Norway and grew up surrounded by illness and death — his mother and sister both died of tuberculosis while he was young. These experiences of loss and anxiety became the central subjects of his art. He lived until 1944, long enough to see his work declared "degenerate" by the Nazis, who confiscated over 80 of his paintings. He later donated his entire estate to the city of Oslo, which built the Munch Museum to house it.',
      pauseAfterMs: 1200,
    },
    {
      id: 'the-scream-6',
      label: 'Section 6 of 6: Fun fact',
      text: 'The bloodred sky in The Scream may be more than artistic expression. Researchers believe Munch witnessed the atmospheric aftereffects of the 1883 eruption of Krakatoa in Indonesia — one of the most violent volcanic eruptions in recorded history. The ash it ejected into the stratosphere created vivid, multicolored sunsets visible across Europe for months. If so, one of the most powerful images of existential dread in Western art may have been inspired by a volcanic eruption on the other side of the world.',
      pauseAfterMs: 1500,
    },
  ],
}

export function getNarrationSegments(artworkId: string): NarrationSegment[] {
  const normalizedId =
    artworkId === 'starring-night' || artworkId === 'starrynight'
      ? 'starry-night'
      : artworkId
  return narrationData[normalizedId] ?? []
}
