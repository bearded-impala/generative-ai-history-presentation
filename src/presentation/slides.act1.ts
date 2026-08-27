import type { SlideData } from "./types";

export const ACT_I_SLIDES: SlideData[] = [
  {
    id: "slide-1",
    index: 0,
    act: 1,
    title: "The Imitation Game",
    subtitle: "Alan Turing, 1950 - Can Machines Think?",

    camera: {
      id: "slide-1-cam",
      position: [0, 3.4, 13],
      lookAt: [0, 2.2, 2],
      fov: 42,
      transitionDuration: 6,
      easing: "easeInOutSine",
      idleDrift: { enabled: true, amplitude: 0.06, speed: 0.12 },
    },

    environment: {
      background: "#07070a",
      fog: { color: "#0d0f14", near: 8, far: 34 },
      ambientIntensity: 0.14,
      keyLight: { color: "#d9b877", intensity: 0.6, position: [2, 6, 8] },
      particles: { count: 450, color: "#d4af6a", size: 0.018, speed: 0.04, spread: 12 },
    },

    visualState: {
      mode: "TURING_MACHINE",
      props: {
        tapeLength: 40,
        tapeSymbolSpeed: 0.6,
        glowColor: "#d4af6a",
        roomType: "interrogation_chamber",
        showEnigmaSilhouette: true,
        teletypeCadence: 0.35,
      },
    },

    visualGuide: {
      headline: "The Imitation Game: one interrogator, two closed doors",
      legend: [
        { color: "#e8dcc0", label: "Left terminal: the human respondent" },
        { color: "#d4af6a", label: "Right terminal: the machine, pretending to be one" },
        { color: "#ffe08a", label: "Interrogator silhouette between the doors; the quote crystallizes above the tape" },
        { color: "#8a7040", label: "An Enigma rotor turning in the distance: Bletchley Park, ten years earlier" },
      ],
      takeaway:
        "Turing's test is purely behavioural: if the interrogator can't reliably tell which door is which, what are we still arguing about?",
    },

    script: [
      "[LOOK TO AUDIENCE] Picture a room. Two keyboards, wired to two closed doors. Behind one door, a person. Behind the other, something that may not be a person at all. [PAUSE 2s]",
      "The man who set up this room had spent the war breaking German military codes - work that may have shortened it by years. [PAUSE 1s] So machines that outsmart the people who built them weren't a thought experiment to him. And when he asked whether a machine could think, people listened.",
      "It's 1950. His name is Alan Turing, and the question he asks sounds almost childish. Can machines think? [EMPHASIS] And then he does something strange. He decides his own question is a bad one. Too vague. Nobody agrees what a machine is. Nobody agrees what thinking is. So he throws it out.",
      "In its place, he proposes a game. Someone sits at a keyboard and types questions to two hidden players. One is a person. One is a machine pretending to be a person. [TRIGGER 3D MORPH] And if the questioner can't reliably tell which is which, Turing asks, what exactly are we still arguing about?",
      "[PAUSE 1s] [TRIGGER 3D MORPH] That's the clever bit. He doesn't answer the question, he replaces it. An impossible philosophical puzzle turns into something you can run a test on. Behaviour. Performance. Imitation, held up long enough to count. [EMPHASIS] He doesn't explain intelligence. He turns it into a test you can pass or fail.",
      "And notice what he never says. He never says the machine is thinking. What he says is that if you can't tell the difference, then maybe the difference isn't doing the work you think it is. [PAUSE 2s] That's a dangerous sentence. It's also the sentence this whole field is built on.",
      "[LOOK TO AUDIENCE] [TRIGGER 3D MORPH] Seventy-five years on, we're still playing his game. Every chatbot you've second-guessed is that room and those two doors. [PAUSE 1s] Today we're following one thread through that history - how machines learned to handle language. [PAUSE 2s] Let's see how we got here.",
    ],

    timelineYear: 1950,
    timelineLabel: "1950",
  },
  {
    id: "slide-2",
    index: 1,
    act: 1,
    title: "The Dartmouth Workshop",
    subtitle: "McCarthy, Minsky, Shannon - Coining \"Artificial Intelligence,\" 1956",

    camera: {
      id: "slide-2-cam",
      position: [5, 5.5, 7],
      lookAt: [5, 2.8, -3],
      fov: 52,
      transitionDuration: 5,
      easing: "easeOutExpo",
      idleDrift: { enabled: true, amplitude: 0.08, speed: 0.18 },
    },

    environment: {
      background: "#0a0d12",
      fog: { color: "#101826", near: 14, far: 50 },
      ambientIntensity: 0.34,
      keyLight: { color: "#8fe3ff", intensity: 0.8, position: [5, 8, 4] },
      particles: { count: 850, color: "#7fd6ff", size: 0.02, speed: 0.16, spread: 16 },
    },

    visualState: {
      mode: "DARTMOUTH_ROUNDTABLE",
      props: {
        tableRadius: 6,
        attendeeGlyphCount: 10,
        nameplateGlow: ["McCarthy", "Minsky", "Shannon", "Rochester"],
        sparkDensity: 0.8,
        termFormationText: "ARTIFICIAL INTELLIGENCE",
        termFormationDurationSec: 6,
      },
    },

    visualGuide: {
      headline: "A photograph of 1956: the last un-abstracted room this hour will show",
      legend: [
        { color: "#c8b89a", label: "The group on the lawn - McCarthy, Minsky, Shannon, Rochester, and colleagues" },
        { color: "#e8dcc0", label: "The origin of a name: Artificial Intelligence, coined on the proposal" },
        { color: "#8fe3ff", label: "After this, every idea in the show is too big for a photograph" },
      ],
      takeaway:
        "No unified theory of intelligence came out of that summer. The name did, and it outlived every prediction made under it.",
    },

    script: [
      "[EMPHASIS] Six years later, the question leaves the philosophy department. [PAUSE 1s] Summer, 1956. Dartmouth College. A young professor named John McCarthy has talked a foundation into paying for something unusual - an eight-week workshop for the handful of people on Earth who think machines might one day reason. [PAUSE 1s] You're looking at a photograph of that summer. It's the last ordinary room you'll see today.",
      "McCarthy needs a name for what they're chasing. Everything on offer is either taken or too narrow. So he writes three new words on the funding proposal. [EMPHASIS] Artificial Intelligence. [PAUSE 2s] The name of this whole field got invented to help push a grant through.",
      "Look at who's in that picture. McCarthy himself. Marvin Minsky, barely thirty, already convinced the brain is just a meat machine. Claude Shannon, who'd shown you can boil information down to bits and switches. [PAUSE 1s] And drifting in and out all summer, Allen Newell and Herbert Simon, with a program called the Logic Theorist. It proved mathematical theorems on its own - and a few of them, it proved more neatly than the humans had.",
      "The proposal they'd written a year earlier makes a claim that still stops people cold. [EMPHASIS] Every aspect of learning, they wrote, can in principle be described so precisely that a machine can be made to simulate it. [PAUSE 2s] Not someday. In principle. Now.",
      "[LOOK TO AUDIENCE] In that room, optimism wasn't a mood. It was a working assumption. They really did believe a decade, maybe two, would be enough to build a mind. [PAUSE 2s] They were off. Wildly off.",
      "By the end of the eight weeks, nobody has a theory of intelligence. Half the guests drifted in for a week and drifted out again. [PAUSE 1s] But the name sticks. [EMPHASIS] And the dozen or so people who passed through that room go on to found almost every major AI lab in America. The field finally has an origin story.",
    ],

    timelineYear: 1956,
    timelineLabel: "1956",
  },
  {
    id: "slide-3",
    index: 2,
    act: 1,
    title: "The Perceptron",
    subtitle: "Frank Rosenblatt & the Mark I - Connectionism Is Born, 1958",

    camera: {
      id: "slide-3-cam",
      position: [11.25, 5.25, 1.55],
      lookAt: [11.05, 3.45, -7],
      fov: 48,
      transitionDuration: 5,
      easing: "easeInOutCubic",
      idleDrift: { enabled: true, amplitude: 0.05, speed: 0.2 },
    },

    environment: {
      background: "#08090c",
      fog: { color: "#0c1420", near: 6, far: 26 },
      ambientIntensity: 0.22,
      keyLight: { color: "#3ea6ff", intensity: 0.95, position: [12.4, 6.5, 2.2] },
      particles: { count: 1200, color: "#3ea6ff", size: 0.015, speed: 0.22, spread: 10 },
    },

    visualState: {
      mode: "PERCEPTRON_NET",
      props: {
        hardwareModel: "Mark I Perceptron",
        inputGridSize: [20, 20],
        synapseCount: 512,
        potentiometerMotorSound: true,
        pulseSpeed: 1.2,
        learningAnimation: true,
      },
    },

    visualGuide: {
      headline: "The Mark I Perceptron: 400 photocells, 512 motor driven weights",
      legend: [
        { color: "#3ea6ff", label: "20 × 20 photocell grid: four hundred electronic eyes" },
        { color: "#4fd8ff", label: "Positive weights: thicker when |w| is larger" },
        { color: "#ff5cd6", label: "Negative weights: a miss ticks that motor and the line thickens or thins" },
        { color: "#ffe08a", label: "Summation unit: fires, or doesn't" },
      ],
      takeaway:
        "This machine didn't just compute an answer. Every mistake turned a motor, and the weights physically changed.",
    },

    script: [
      "[PAUSE 1s] While that group is still theorising, one man is already building. Frank Rosenblatt is a psychologist, not an engineer. And he has a completely different instinct. [EMPHASIS] Stop trying to program intelligence in. What if you could grow it instead?",
      "In 1958, with money from the U.S. Navy, Rosenblatt unveils the Mark I Perceptron. [TRIGGER 3D MORPH] Not a program. A machine. The size of a fridge, with a twenty-by-twenty grid of light sensors for an eye - four hundred electronic eyes - wired into five hundred and twelve dials. And every dial is turned by its own little motor.",
      "[PAUSE 2s] [TRIGGER 3D MORPH] Think about what that means. You show it a picture. If it gets the answer wrong, the motors whirr and the dials physically turn. The machine adjusts itself. Show it enough examples and, slowly, mechanically, it gets better. [EMPHASIS] Nobody wrote the rules down. It found them.",
      "The press loses its mind. Reporters walk out convinced the Navy has built the seed of a conscious machine - something that will one day walk, talk, and know that it exists. [EMPHASIS] What Rosenblatt claims is narrower, and still enormous. A machine that learns from experience instead of instruction.",
      "He doesn't duck the spotlight either. In lectures, Rosenblatt wonders aloud whether these machines might one day be conscious, or even build copies of themselves. [PAUSE 1s] His critics, some of them a short drive away at MIT, think he's overselling a toy.",
      "[LOOK TO AUDIENCE] [TRIGGER 3D MORPH] And for a few years, this is the future. Not logic and rules reasoning their way towards intelligence. Artificial neurons, crude as they are, learning their way there instead. [PAUSE 2s] Two very different bets on how you build a mind. And in 1958, both are still alive.",
    ],

    timelineYear: 1958,
    timelineLabel: "1958",
  },
  {
    id: "slide-4",
    index: 3,
    act: 1,
    title: "The XOR Barrier",
    subtitle: "Minsky & Papert's \"Perceptrons\" - Proving the Limit, 1969",

    camera: {
      id: "slide-4-cam",
      position: [16, 6.8, -6],
      lookAt: [16, 3.2, -14],
      fov: 50,
      transitionDuration: 4.5,
      easing: "easeInOutQuint",
      idleDrift: { enabled: true, amplitude: 0.1, speed: 0.25 },
    },

    environment: {
      background: "#0b0c10",
      fog: { color: "#111318", near: 5, far: 22 },
      ambientIntensity: 0.2,
      keyLight: { color: "#ff5c5c", intensity: 0.5, position: [16, 7, -4] },
      particles: { count: 600, color: "#ff4d4d", size: 0.02, speed: 0.3, spread: 9 },
    },

    visualState: {
      mode: "XOR_HYPERPLANE",
      props: {
        planeCount: 1,
        dataPointCount: 4,
        showFailedSeparation: true,
        fractureIntensity: 0.9,
        proofTextOverlay: "∄ linear separator for XOR",
      },
    },

    visualGuide: {
      headline: "Four points, one straight line, and no solution that exists",
      legend: [
        { color: "#4fd8ff", label: "XOR = 1: the inputs differ" },
        { color: "#ff5c6a", label: "XOR = 0: the inputs match" },
        { color: "#ff4d6a", label: "The sweeping plane, flashing red on every orientation that fails" },
      ],
      takeaway:
        "The separability check runs live, every frame, against real geometry. For this arrangement no orientation ever succeeds.",
    },

    script: [
      "[PAUSE 1s] Eleven years is a long time for a promise to go unchecked. In 1969, two men at MIT sit down to check Rosenblatt's maths. One of them is Marvin Minsky, who sat at that Dartmouth table. The other is his colleague Seymour Papert. Together they publish a book called, simply, 'Perceptrons.' [EMPHASIS] Technically it's careful, rigorous work. Functionally, it's an execution.",
      "[TRIGGER 3D MORPH] So here's their proof, stripped right down. Take the simplest pattern you can think of. Two switches. The answer is true when they disagree, false when they match. Engineers call it XOR. Four cases. Plot them as four points. [PAUSE 2s] Now draw one straight line that puts the true points on one side and the false ones on the other. [EMPHASIS] You can't. No such line exists.",
      "[TRIGGER 3D MORPH] And a single-layer perceptron can only ever draw straight lines. That's the whole range of what it can do. So XOR sits permanently out of reach. [PAUSE 1s] It's not a bug. It's not a training problem. It's a wall built into the geometry.",
      "Now, Minsky and Papert do admit, in a footnote almost nobody reads, that stacking several layers could get around that wall. [EMPHASIS] But the footnote doesn't survive contact with the funding agencies. Only the verdict does. Perceptrons are fundamentally limited.",
      "[PAUSE 1s] And to be fair to them, they never claim neural networks are worthless forever. [EMPHASIS] But 'this needs more research' reads very differently to a funding committee than 'this is a promising direction.'",
      "[LOOK TO AUDIENCE] [TRIGGER 3D MORPH] One proof, about one toy problem, becomes the gravestone for an entire approach. [PAUSE 2s] The money that built Rosenblatt's machines is about to notice. And it's about to leave the room.",
    ],

    timelineYear: 1969,
    timelineLabel: "1969",
  },
  {
    id: "slide-5",
    index: 4,
    act: 1,
    title: "The First AI Winter",
    subtitle: "The Lighthill Report & the DARPA Freeze, 1970s",

    camera: {
      id: "slide-5-cam",
      position: [21.2, 3.15, -15.6],
      lookAt: [21.05, 1.45, -24],
      fov: 58,
      transitionDuration: 7,
      easing: "easeInOutSine",
      idleDrift: { enabled: false },
    },

    environment: {
      background: "#0a1118",
      fog: { color: "#0a1118", near: 4, far: 45 },
      ambientIntensity: 0.07,
      particles: { count: 280, color: "#4a6b8a", size: 0.022, speed: 0.015, spread: 26 },
    },

    visualState: {
      mode: "WINTER_VOID",
      props: {
        emptinessRadius: 30,
        frozenNodeCount: 150,
        frostDensity: 0.7,
        fundingGraphCollapse: true,
        fundingTickerText: "DARPA: THE CHECKS STOP",
        lighthillReportOverlay: true,
      },
    },

    visualGuide: {
      headline: "The money leaves the room",
      legend: [
        { color: "#4a6b8a", label: "Funding collapsing toward zero: ALPAC 1966, Lighthill 1973, the Mansfield Amendment" },
        { color: "#bfe8ff", label: "The perceptron network, frozen mid-thought" },
        { color: "#e2f6ff", label: "Ice fragments bursting outward, then decelerating into stillness" },
      ],
      takeaway:
        "Nothing was disproved here. Three governments simply stopped believing the idea was worth the risk.",
    },

    script: [
      "[PAUSE 2s] Watch what happens next. Not an event. A silence. Through the early 1970s, the money starts to disappear. The money that built the Perceptron. The money that filled that Dartmouth summer with confidence.",
      "It doesn't start with AI, though. In 1966, a U.S. government committee reviews machine translation - another of the field's oversold promises - and reports back that computers are nowhere near replacing human translators. [PAUSE 1s] [TRIGGER 3D MORPH] So that funding dries up first. [EMPHASIS] It's a warning shot, and nobody takes it seriously enough.",
      "Over in Britain, the government asks the mathematician James Lighthill to review the whole field. [EMPHASIS] He reports back in 1973, and he's blunt. AI has failed to deliver on its promises, beaten again and again by what he calls the combinatorial explosion. Problems that look easy in a toy example, and turn impossible the moment you scale them to the real world. [PAUSE 1s] [TRIGGER 3D MORPH] British university funding for AI gets cut to almost nothing, overnight.",
      "[TRIGGER 3D MORPH] And in America, DARPA runs out of patience too - DARPA, which had been this field's most patient funder. A new law says military money has to go to work with obvious, near-term uses. Open-ended exploration of machine intelligence doesn't qualify. The cheques stop. [PAUSE 1s] Put those three together and this isn't one bad review any more. It's a pattern. Three governments reaching the same conclusion within a few years of each other.",
      "[EMPHASIS] And here's the part that stings. The phrase 'AI Winter' doesn't get coined until 1984 - by Marvin Minsky. [PAUSE 1s] The same man whose book helped trigger the freeze, looking back and finally giving it a name.",
      "[PAUSE 2s] Labs close. Graduate students quietly change fields. The word 'perceptron' becomes something you leave off a grant application if you want it funded. [LOOK TO AUDIENCE] Not because anyone proved the idea impossible. Because everyone stopped believing it was worth the risk. [PAUSE 2s] The room goes cold. And it stays cold for most of a decade.",
    ],

    timelineYear: 1973,
    timelineLabel: "1970s",
  },
  {
    id: "slide-6",
    index: 5,
    act: 1,
    title: "The Symbolic Plateau",
    subtitle: "MYCIN, XCON, and the Brittleness of Rules, 1980s",

    camera: {
      id: "slide-6-cam",
      position: [25, 4.6, -20],
      lookAt: [25, 2.4, -29],
      fov: 54,
      transitionDuration: 5.5,
      easing: "easeInOutCubic",
      idleDrift: { enabled: true, amplitude: 0.05, speed: 0.1 },
    },

    environment: {
      background: "#0c0a08",
      fog: { color: "#141008", near: 7, far: 30 },
      ambientIntensity: 0.3,
      keyLight: { color: "#e0c060", intensity: 0.7, position: [25, 6, -22] },
      particles: { count: 1800, color: "#c9a227", size: 0.012, speed: 0.01, spread: 14 },
    },

    visualState: {
      mode: "EXPERT_SYSTEM_LATTICE",
      props: {
        ruleNodeCount: 2000,
        latticeRigidity: 1.0,
        brittleFractureOnEdgeCase: true,
        systemLabels: ["MYCIN", "XCON/R1"],
        messyDataIntrusion: true,
      },
    },

    visualGuide: {
      headline: "Thousands of handwritten rules, and the one case nobody wrote a rule for",
      legend: [
        { color: "#c9a227", label: "The rule lattice: 2,000+ manually authored IF-THEN rules, rigid by design" },
        { color: "#ffd479", label: "MYCIN unused; XCON beside a $40M/yr counter once the savings are named" },
        { color: "#ff5c5c", label: "Messy real-world data drifting through, cracking whatever rule it touches" },
      ],
      takeaway:
        "The system never learns. It only accumulates, and every unanticipated case costs another rule, written by hand, forever.",
    },

    script: [
      "[PAUSE 1s] Cold doesn't mean dead, though. By the early 1980s a different bet starts paying off - and it's the one Minsky himself favoured. Not learning from data. Writing the expertise down directly, as rules. [EMPHASIS] If this, then that. By hand. By the thousand.",
      "[TRIGGER 3D MORPH] The first one is called MYCIN. It interviews a doctor about a patient's symptoms, then recommends a treatment for blood infections. In blind tests, it matches or beats human specialists. [PAUSE 1s] And it's never used in a single hospital. Because nobody can answer the question underneath it. When a machine full of rules is wrong about someone's life, who is responsible?",
      "Its luckier cousin is XCON. Digital Equipment built it to configure custom computer orders - thousands of parts, endless combinations, work that used to take a trained engineer. [TRIGGER 3D MORPH] And it works. It saves them an estimated forty million dollars a year. [EMPHASIS] It's the first real proof that this stuff can pay for itself. For a moment, in boardrooms if not in labs, symbolic AI looks like the safest bet in computing.",
      "[PAUSE 2s] But look at what it costs to keep running. XCON ends up needing thousands upon thousands of hand-written rules. Every new product means someone sits down and writes more of them. Every situation nobody anticipated, more rules. By hand. Forever. [EMPHASIS] The system never learns. It only accumulates.",
      "[LOOK TO AUDIENCE] And that's the crack running under the whole decade. Real data is messy. It's full of exceptions nobody wrote a rule for. Logic is precise. The world isn't. [PAUSE 2s] Meanwhile the other idea - machines that adjust themselves instead of being told the rules - is still out there, waiting. [TRIGGER 3D MORPH] It hasn't gone anywhere.",
    ],

    timelineYear: 1980,
    timelineLabel: "1980s",
  },
];
