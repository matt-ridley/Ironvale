// The Emberreach, beyond the Door (Act 4): the Wardens' old homeland, half burned to ash by the dragon and half wild
// forest. The far side of the Door (an exit back to the gatehouse), the Threshold (the Wardens' burned gate-camp, now
// a camp of yours), the ash road north, west and east, the lava gorge right across the map, and the edge of the
// wildwood in the west. A wall of burned trees leaves the road the only way west, past the kobold warband. In the
// wildwood, a trail (the grey wolf waits at its foot) climbs north to Claire's grove, with a pool, and a hidden glade
// behind a thicket only she knows the way through. East, at the road's end: Lastwatch, the Wardens' burned outpost
// (Matt's hold, a camp once you've met him), with the Cinder Wardens at its west gate, and the shrine of the Dawn to
// its south-east (Robyn's pledge: hold its light), and the Oath of Dawn's cursed gate in the fort's old tower.
// Lastwatch's north gate opens onto the Wardens' bridge over the gorge (Matt lowers it), and the
// aeries beyond: the brood's hunting grounds, a nest in the crags, the mouth of the kobolds' diggings (Megan's
// pledge: Dunstan), and the Oath of Storm's vault on an islet in a lava lake. The Oath of Iron's path is the gorge's
// broken bridge, south of the road's old end.
// One character per tile; the legend is TILES in map.js. Edit the rows by hand (keep them all 104 wide).

export const BEYOND = {
  name: "beyond",
  region: "beyond",
  outdoors: true,
  spawn: { x: 32, y: 33 },
  zones: [
    { id: "threshold", name: "The Threshold", x0: 25, y0: 26, x1: 39, y1: 36, music: "emberreach", safe: true },
    { id: "grove", name: "Claire's Grove", x0: 2, y0: 2, x1: 16, y1: 15, music: "wildwood" },
    { id: "lastwatchHold", name: "Lastwatch", x0: 73, y0: 16, x1: 91, y1: 28, music: "keep", safe: true },
    { id: "dawnShrine", name: "The Shrine of the Dawn", x0: 95, y0: 31, x1: 99, y1: 34, music: "keep" },
    { id: "wildwood", name: "The Wildwood's Edge", x0: 0, y0: 0, x1: 21, y1: 39, music: "wildwood" },
    { id: "lastwatch", name: "Lastwatch's Fields", x0: 60, y0: 15, x1: 103, y1: 39, music: "emberreach" },
    { id: "aeries", name: "The Aeries", x0: 22, y0: 0, x1: 103, y1: 11, music: "emberreach" },
    { id: "ashRoad", name: "The Ash Road", x0: 0, y0: 0, x1: 103, y1: 39, music: "emberreach" },
  ],
  // Back through the Door, into the gatehouse.
  exits: [{ x: 32, y: 36, to: "gatehouse", at: { x: 20, y: 2 }, facing: "down" }],
  objects: [
    // The Door from this side, standing open (only a picture: walk into it to go back).
    { id: "farDoor", x: 32, y: 36, sprite: "openDoor", walkable: true, still: true },
    { id: "thresholdFire", x: 30, y: 30, sprite: "campfire", script: "campfire", still: true },
    // Pip, if he stowed away (he did, if he's had his big adventure): sent home by a wolf once the warband's gone.
    { id: "pipStowaway", x: 29, y: 29, sprite: "villager", script: "pipStowaway", shownWhen: "pipStowedAway", goneWhen: "pipSentHome" },
    // The kobold warband across the road (only the road gets past them), until the wolves come.
    { id: "warband1", x: 24, y: 20, sprite: "kobold", script: "warband", goneWhen: "warbandFled" },
    { id: "warband2", x: 25, y: 19, sprite: "kobold", script: "warband", goneWhen: "warbandFled" },
    { id: "warband3", x: 25, y: 21, sprite: "kobold", script: "warband", goneWhen: "warbandFled" },
    // The wolf that waits for you at the wildwood's edge, and then, quest 9 done, at the foot of the trail to the grove.
    { id: "wolfGuide", x: 17, y: 20, sprite: "wolf", script: "wolfGuide", shownWhen: "warbandFled", goneWhen: "q9Done" },
    { id: "wolfWaiting", x: 10, y: 15, sprite: "wolf", script: "wolfTrail", shownWhen: "q9Done", goneWhen: "wolfFollowed" },
    // Claire's grove (quest 10): Claire, until she joins; then her fire (a camp), a raven with news, and the thicket she
    // shows you the way through, to a glade and an old Warden cache.
    { id: "claire", x: 9, y: 7, sprite: "claire", frame: 0, script: "claireMeet", goneWhen: "claireJoined" },
    { id: "groveFire", x: 8, y: 9, sprite: "campfire", script: "campfire", shownWhen: "claireJoined", still: true },
    { id: "raven", x: 13, y: 5, sprite: "raven", script: "raven", shownWhen: "claireJoined", still: true },
    { id: "thicket", x: 5, y: 12, sprite: "thicket", script: "thicket", goneWhen: "claireJoined", still: true },
    { id: "gladeChest", x: 4, y: 14, sprite: "chest", script: "chest", goneWhen: "gladeChestOpened", still: true, loot: { gold: 400, items: ["potionGreaterHealing", "potionGreaterHealing", "scrollFireball"] } },
    // Lastwatch (quest 11): the Cinder Wardens in its west gate, Matt inside, his fire (a camp, after you've met him),
    // and the north gate onto the Wardens' bridge, barred until he lowers it.
    { id: "cinderGate1", x: 72, y: 16, sprite: "cinderWarden", script: "cinderGate", goneWhen: "cindersBeaten" },
    { id: "cinderGate2", x: 72, y: 17, sprite: "cinderWarden", script: "cinderGate", goneWhen: "cindersBeaten" },
    { id: "matt", x: 82, y: 19, sprite: "matt", script: "matt", shownWhen: "cindersBeaten" },
    { id: "lastwatchFire", x: 80, y: 21, sprite: "campfire", script: "campfire", shownWhen: "q11Done", still: true },
    { id: "northGate", x: 82, y: 15, sprite: "portcullis", script: "northGate", goneWhen: "q11Done", still: true },
    // Dunstan, once he's free (Megan's pledge): he's drawing Matt a map of the Emberdeep.
    { id: "dunstan", x: 84, y: 19, sprite: "villager", script: "dunstan", shownWhen: "meganPledged" },
    // The Oath of Dawn's path: the cursed gate in Lastwatch's old tower, which burns anyone else, and the vault behind it.
    { id: "cursedGate", x: 87, y: 23, sprite: "portcullis", script: "cursedGate", goneWhen: "dawnGateOpen", still: true },
    { id: "dawnVault", x: 87, y: 25, sprite: "chest", script: "oathVault", oath: "dawn", goneWhen: "dawnVault", still: true },
    // The shrine of the Dawn (Robyn's pledge): its door, shut on the dead inside, then its lamp, lit again.
    { id: "dawnDoor", x: 97, y: 30, sprite: "gate", script: "dawnDoor", goneWhen: "robynPledged", still: true },
    { id: "dawnLamp", x: 97, y: 33, sprite: "shrine", script: "dawnLamp", shownWhen: "robynPledged", still: true },
    // Over the bridge: a nest in the crags, and the kobolds' diggings (Megan's pledge, in a later part of Act 4).
    { id: "aerieNest", x: 69, y: 3, sprite: "chest", script: "chest", goneWhen: "aerieNestOpened", still: true, loot: { gold: 600, items: ["potionGreaterHealing", "potionGreaterHealing", "scrollFireball"] } },
    { id: "diggings", x: 98, y: 4, sprite: "mineMouth", script: "diggings", still: true },
    // The Oath of Storm's path: a rune stone at the edge of a lava lake, and the vault on the islet in the middle.
    { id: "stormStone", x: 73, y: 7, sprite: "runeStone", script: "stormStone", still: true },
    { id: "stormVault", x: 76, y: 7, sprite: "chest", script: "oathVault", oath: "storm", goneWhen: "stormVault", still: true },
    // The lip of the gorge, where the road's old bridge used to be.
    { id: "gorgeEdge", x: 32, y: 15, sprite: "brokenBridge", script: "gorgeEdge", still: true },
  ],
  rows: [
  "^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^",
  "^WWWWWWWWWWWWWWWWWaaaaezaaaaezaaazzaaaaaaaaaaaaaaaaezaaazaazaaaaa^^^^^^^^aaaaezaazaaazaaeaaaa^^^^^^^^^^^",
  "^WWWWWWWWWWWWWWWWWaazaeeaezaaaaaaazazzzaaaaealllllazaaaaaaaaaaaaz^aaaaaa^aazaazaaaaaaaaaaaeaa^^^^^^^^^^^",
  "^WW.....W.....,WWWazaaaaaaaaaaaeaaazaaaeaaaaalllllazaeaaaaaaaazaa^aaaaaa^aaaeaaaaaaaaeaaaaaaa^^^^^^^^^^^",
  "^WW.,......,....WWazaaaazaealllllzaaezaeazaaalllllaeaaaaaaeazeaae^aaaaaa^aaaaaaaaaaaazeelllaz^^^^^C^^^^^",
  "^WW.............WWaeaaaazaezlllllaaaaeaaaazzeeaaaaaaaeeazaaaazzaaaazaaaaaaaaeaaaaaaaaazalllazaaeaaaaaza^",
  "^WW.~~..........WWazzaaaazzalllllaaaaazzeaaeazeaaaazeezaaazeazaaaaaaazeaaelllllaaaeeaaaaaaeaeaaeaaaaaza^",
  "^WW.~~..........WWaaaaaazaazaaaaazazzzazaeaaaaaaazzazlllllaaaeaaeaeaaaaaaallollzaaaaaaaaaaaaaaaaaaaaaea^",
  "^WW.............WWaaaaaaaaaeaaaaaaaazaaaaazaaazaaeazalllllzzezeaeaaaeaaaaalllllazaaaeaaaaaaaaaaaaaeaaaa^",
  "^WW,............WWaaazeaaazzzaeeaazazaaaazazaaaaaaaaelllllaaaaaaaaeaaaaaezzeaaaaazaaaeaaaaaaaazeaaaazee^",
  "^WW...,.....,...WWaaaaaaaaaeaazaazazeaaazzaeaaazezaeaaeaeaaaaaaazaaaaaeaeaaaaaaaaaaazaazeazazaaaaezazaa^",
  "^WWW...........WWWaeaaaaaeeeaeeeaeaaeeeaeeeaeaeeeeeaaeeaaeaeaeeazaaaaaaaaaeaeaaazaaaaazaaeeaaaaaeaaazaa^",
  "^WWWW.WWWW.WWWWWWWllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllll#llllllllllllllllllll^",
  "^WW.....WW.WWWWWWWllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllll#llllllllllllllllllll^",
  "^WW.....WW.WWWWWWWllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllll#llllllllllllllllllll^",
  "^WW.....WW.WWWWWWWeeeaaezeaaaaaeaaaaaaeeeeaaaeaaaeeaeaeaeaeeaaaaaaaaaaaeKKKKKKKKKKnKKKKKKKKKKaaaaeaaaaa^",
  "^WWWWWWWWW.....W...aa.aazaaaaaaa========================================nnnnnnnnnnnnnnnnnnnnKaaaaaaaaaa^",
  "^WWWWWWWWW..W..W...a.aazzzaazzaa=aaaaazaaaaaaaazaazaaaaaaeeoaaaaaaaaaaaannnnnnnnnnnnnnnnnnnnKaaaaaaaaaa^",
  "^WWWWWWWWW..W......aa.azzaaaaaaa=zaaaaaaaaaaaaazaaaaaaaeellloeaaaaaaaaaaKnnnnnnnnnnnnnnnn*nnKaaaeaaaaaa^",
  "^WWWWWWWWWW.....W...a.azzaaaaaaa=aazaaazaaaaooeeeoeaaazellllleaazaaaaaaaKnn**nnnnnnnnnnnnnnnKaaaazaeaaa^",
  "^WWWWWWWWW.W...W..===============aaaaaazaaaoollllloeaaaoellleezazaaaeazaKnnnnnnnnnnnnnnnnnnnKaaeaaaaaaa^",
  "^WWWWWWWWW............aazaaaaaaa=aaaaaaazazellllllloaazaaeoeaaaaaaeezaaaKnnnnnnnnnnnnnnn*nnnKeaaaaaaaaa^",
  "^WW............W...aa.azzzaaaaaa=aaaaaaaaaaollllllloaaaaaaaaaaaaaaaaaaaeKnnnnnnnnnnnnnnnnnnnKaaaaaaaaaa^",
  "^WW.............W....aaazaaaazaz=aazaaaaazaellllllloaaaaaaaaaaaaaazaaaaeKnnnnnnnnnnnnKKnKKnnKeaaaazeaaa^",
  "^WW................azaazzaaazaaa=zaaaaaaaaaeellllloozaaaaaaaaaaaaaaaaaaaKnnnnnnnnnnnnKnnnKnnKaeaazaaaaa^",
  "^WWWWWWWWW...W.....aaaazzaaaaaaa=aaaaaaaaaaaoeeoeeeaaaeeeooaaaaaaaaaaaaaKnnnnnnnnnnnnKnnnKnnKaaaazaaaaa^",
  "^WWWWWWWWWW..........aaazKKKnnnnnnnnnnKKaaaaaaaaaaaaaoellleoaaaaaaaeaaaaKnn*nnnnnnnnnKnnnKnnKaazeaaaaaa^",
  "^WWWWWWWWW.W...W....aazazKnn*nnnnnnn*nnKaazaaaaaazaaaellllleaaaaaaaaaazaKnnn*nnnnnnnnKKKKK*nKaaaaaaaeaa^",
  "^WWWWWWWWW........WazzaazKnnnnnnnnnnnnnneeeaaaaaaaaaaollllloaaaazeaaaaaaKnnnnnnnnnnnnnnnnnnnKaaaaaaaaaa^",
  "^WWWWWWWWW...W........aaznnnnnnnnnnnnnnnllleeaaaaazaaellllloaaaaaaaaaaaaKKKKKKKKKKKKKKKKKKKKKaaaaaaaaaa^",
  "^WWWWWWWWW............aaznnnnnnnnnnnnnnKlllloaaaaaaaaeollleoaaaaaaaaaaaeeazaaaaaaaaaaazeaaaaaaKKKnKKKaa^",
  "^WWWWWWWWW.....W....a.azznnnnnnnnnnnnnnKllleeaaaaaaaaaoeoeoaaaaaaaaaaaaaeaaaaaaeeaaeaeaaaaaaeaKnnnnnKaa^",
  "^WWWWWWWWWWWWWWWWWa.aaazzKnnnnnnnnnnn*nnoeoaaaaaaaaaaaaaaaaazaaaaaaaaaaaaaaaaaaaaeaaaaaaaaaaaaKnnnnnKaa^",
  "^WW^WWWWW^W^^^W^^W^.^aaazKnnnnnnnnnnnnnnaaaaaaa^aaa^aaa^azaa^^aaeaaaaaaaaaaaaaaeaaaaaaaaeaaaaaKnnnnnKaa^",
  "^^^^^^^^^^^^^^^^^^^^^^aaa^KKKKKKnKKKKKKaaa^^^^^^^^^^^^^^^^^^^^^^aaaaeazaaeazaaaazaaaaeaaazaeaaKnnnnnKae^",
  "^^^^^^^^^^^^^^^^^^^^^^^^^^KKKKKKnKKKKKK^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^KKKKKKK^^^",
  "^^^^^^^^^^^^^^^^^^^^^^^^^^KKKKKKnKKKKKK^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^",
  "^^^^^^^^^^^^^^^^^^^^^^^^^^KKKKKKKKKKKKK^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^",
  "^^^^^^^^^^^^^^^^^^^^^^^^^^KKKKKKKKKKKKK^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^",
  "^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^",
  ],
};
