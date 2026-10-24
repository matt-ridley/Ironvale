// The Emberreach, beyond the Door (Act 4): the Wardens' old homeland, half burned to ash by the dragon and half wild
// forest. So far only its south: the far side of the Door (an exit back to the gatehouse), the Threshold (the Wardens'
// burned gate-camp, now a camp of yours), the ash road north and west, the lava gorge right across the map (and the
// burned land past it, seen but not reached yet), and the edge of the wildwood in the west. A wall of burned trees
// leaves the road the only way west, past the kobold warband. Later steps add the north (Lastwatch, the aeries).
// One character per tile; the legend is TILES in map.js. Edit the rows by hand (keep them all 64 wide).

export const BEYOND = {
  name: "beyond",
  region: "beyond",
  outdoors: true,
  spawn: { x: 32, y: 33 },
  zones: [
    { id: "threshold", name: "The Threshold", x0: 25, y0: 26, x1: 39, y1: 36, music: "emberreach", safe: true },
    { id: "wildwood", name: "The Wildwood's Edge", x0: 0, y0: 0, x1: 21, y1: 39, music: "emberreach" },
    { id: "ashRoad", name: "The Ash Road", x0: 0, y0: 0, x1: 63, y1: 39, music: "emberreach" },
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
    // The wolf that waits for you at the wildwood's edge, and then, quest 9 done, at a trail into the trees.
    { id: "wolfGuide", x: 17, y: 20, sprite: "wolf", script: "wolfGuide", shownWhen: "warbandFled", goneWhen: "q9Done" },
    { id: "wolfWaiting", x: 10, y: 23, sprite: "wolf", script: "wolfWaiting", shownWhen: "q9Done" },
    // The lip of the gorge, where the road's old bridge used to be.
    { id: "gorgeEdge", x: 32, y: 15, sprite: "brokenBridge", script: "gorgeEdge", still: true },
  ],
  rows: [
  "^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^",
  "^WWWWWWWWWWWWWWWWWaaaaezaaaaezaaazzaaaaaaaaaaaaaaaaezaaazaazaaa^",
  "^WWWWWWWWWWWWWWWWWaazaeeaezaaaaaaazazzzaaaaealllllazaaaaaaaaaaa^",
  "^WWWWWWWWWWWWWWWWWazaaaaaaaaaaaeaaazaaaeaaaaalllllazaeaaaaaaaaz^",
  "^WWWWWWWWWWWWWWWWWazaaaazaealllllzaaezaeazaaalllllaeaaaaaaeazea^",
  "^WWWWWWWWWWWWWWWWWaeaaaazaezlllllaaaaeaaaazzeeaaaaaaaeeazaaaazz^",
  "^WWWWWWWWWWWWWWWWWazzaaaazzalllllaaaaazzeaaeazeaaaazeezaaazeaza^",
  "^WWWWWWWWWWWWWWWWWaaaaaazaazaaaaazazzzazaeaaaaaaazzazlllllaaaea^",
  "^WWWWWWWWWWWWWWWWWaaaaaaaaaeaaaaaaaazaaaaazaaazaaeazalllllzzeze^",
  "^WWWWWWWWWWWWWWWWWaaazeaaazzzaeeaazazaaaazazaaaaaaaaelllllaaaaa^",
  "^WWWWWWWWWWWWWWWWWaaaaaaaaaeaazaazazeaaazzaeaaazezaeaaeaeaaaaaa^",
  "^WWWWWWWWWWWWWWWWWaeaaaaaeeeaeeeaeaaeeeaeeeaeaeeeeeaaeeaaeaeaee^",
  "^WWWWWWWWWWWWWWWWWlllllllllllllllllllllllllllllllllllllllllllll^",
  "^WWWWWWWWWWWWWWWWWlllllllllllllllllllllllllllllllllllllllllllll^",
  "^WWWWWWWWWWWWWWWWWlllllllllllllllllllllllllllllllllllllllllllll^",
  "^WWWWWWWWWWWWWWWWWeeeaaezeaaaaaeaaaaaaeeeeaaaeaaaeeaeaeaeaeeaaa^",
  "^WWWWWWWWW.....W...aa.aazaaaaaaa=aaaaaaaaaaaaaaaaaaaaazzazaaaaa^",
  "^WWWWWWWWW..W..W...a.aazzzaazzaa=aaaaazaaaaaaaazaazaaaaaaeeoaaa^",
  "^WWWWWWWWW..W......aa.azzaaaaaaa=zaaaaaaaaaaaaazaaaaaaaeellloea^",
  "^WWWWWWWWWW.....W...a.azzaaaaaaa=aazaaazaaaaooeeeoeaaazelllllea^",
  "^WWWWWWWWW.W...W..===============aaaaaazaaaoollllloeaaaoellleez^",
  "^WWWWWWWWW............aazaaaaaaa=aaaaaaazazellllllloaazaaeoeaaa^",
  "^WW............W...aa.azzzaaaaaa=aaaaaaaaaaollllllloaaaaaaaaaaa^",
  "^WW.............W....aaazaaaazaz=aazaaaaazaellllllloaaaaaaaaaaa^",
  "^WW................azaazzaaazaaa=zaaaaaaaaaeellllloozaaaaaaaaaa^",
  "^WWWWWWWWW...W.....aaaazzaaaaaaa=aaaaaaaaaaaoeeoeeeaaaeeeooaaaa^",
  "^WWWWWWWWWW..........aaazKKKnnnnnnnnnnKKaaaaaaaaaaaaaoellleoaaa^",
  "^WWWWWWWWW.W...W....aazazKnn*nnnnnnn*nnKaazaaaaaazaaaellllleaaa^",
  "^WWWWWWWWW........WazzaazKnnnnnnnnnnnnnneeeaaaaaaaaaaollllloaaa^",
  "^WWWWWWWWW...W........aaznnnnnnnnnnnnnnnllleeaaaaazaaellllloaaa^",
  "^WWWWWWWWW............aaznnnnnnnnnnnnnnKlllloaaaaaaaaeollleoaaa^",
  "^WWWWWWWWW.....W....a.azznnnnnnnnnnnnnnKllleeaaaaaaaaaoeoeoaaaa^",
  "^WWWWWWWWWWWWWWWWWa.aaazzKnnnnnnnnnnn*nnoeoaaaaaaaaaaaaaaaaazaa^",
  "^WW^WWWWW^W^^^W^^W^.^aaazKnnnnnnnnnnnnnnaaaaaaa^aaa^aaa^azaa^^a^",
  "^^^^^^^^^^^^^^^^^^^^^^aaa^KKKKKKnKKKKKKaaa^^^^^^^^^^^^^^^^^^^^^^",
  "^^^^^^^^^^^^^^^^^^^^^^^^^^KKKKKKnKKKKKK^^^^^^^^^^^^^^^^^^^^^^^^^",
  "^^^^^^^^^^^^^^^^^^^^^^^^^^KKKKKKnKKKKKK^^^^^^^^^^^^^^^^^^^^^^^^^",
  "^^^^^^^^^^^^^^^^^^^^^^^^^^KKKKKKKKKKKKK^^^^^^^^^^^^^^^^^^^^^^^^^",
  "^^^^^^^^^^^^^^^^^^^^^^^^^^KKKKKKKKKKKKK^^^^^^^^^^^^^^^^^^^^^^^^^",
  "^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^",
  ],
};
