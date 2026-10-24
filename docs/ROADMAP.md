# Ironvale roadmap

The plan for the rest of the game: how the story carries on after the Goblin King, the rules and systems it needs, and the order to build them in. Steps 1 to 11 and step 12's minigames are done (0.18.0 to 0.30.0; Greywater Fen was built before Fenwatch). Act 3 (steps 13-20) was built from 0.31.0 to 0.38.0. Act 4 (steps 21-27) is being built from 0.40.0. Decisions marked **decided** have been agreed; **open** ones are still to settle. Update this file as things are built or change.

## The shape of the game

| Act | Levels | Region | Hub | Threat | The hero becomes |
|---|---|---|---|---|---|
| 1 Goblins (built) | 1-4 | Oakhollow, Whispering Wood, Goblin Rocks, Willowmere, the Deep Warrens | Oakhollow | The Goblin Chief and the Goblin King | Hero of Oakhollow |
| 2 Ironvale | 5-8 | Greywater Fen, Ironvale Keep (the mountain pass is seen but blocked) | Fenwatch | Mother Sallow, Lord Varric the Ironbound and the risen garrison | Ironvale's Heir |
| 3 The Pass | 9-12 | The mountain pass and the door | Ironvale Keep, rebuilt | A rival who wants the Wardens' power | Warden-in-training |
| 4 Beyond the Door | 13-16+ | Beyond the door | Ironvale Keep | Whatever has been pushing on the door (a dragon fits the SRD at these levels) | Warden of Ironvale |

Each act unlocks more of the world through a story barrier (the Iron Road gate, the rockslide in the pass, the door), never an invisible wall. The world map shows locked regions as dark silhouettes marked ???, so you can see the world is bigger than you can reach yet.

## Act 2: Ironvale

### What the Goblin King leaves behind

Once `kingDefeated` is set, the King's hall shows three things:

1. **The Iron Signet**, on the throne among the stolen treasure: a black iron seal ring with a crest Elder Maren knows, the arms of **Ironvale Keep**, a fortress past the marshes, empty for a hundred years.
2. **Brannoc**, a dwarf smith chained behind the throne. The goblins made him forge for them, which is where the hobgoblins' armour "that turns most blades" came from (Maren's journal already says so).
3. **The King's last words:** *"The bones... they walk. They took our home."*

**The twist:** the goblins lived in the foothills by Ironvale. They broke into the keep's tomb and stole the Signet, the seal that kept the old garrison at rest. The dead rose and drove the goblins out, and the goblins fled into the Warrens and started raiding Oakhollow. The treasure you take from the King caused the whole goblin arc.

### Main quests

| Quest | What happens |
|---|---|
| **Q3 The Iron Signet** | Show the ring to Maren; she tells you about Ironvale. Brannoc, back in Oakhollow, knows the old Iron Road east. Reach Greywater Fen and Fenwatch. |
| **Q4 The Drowned Causeway** | The road to the keep is flooded. **Mother Sallow**, a marsh hag (the SRD green hag, played a little comic), controls the water. The game's first real choice: fight her (CR 3), or trade her the Goblin King's crown and she raises the causeway. The bargain comes back in Act 3. |
| **Q5 Ironvale Keep** | A ruined courtyard, chapel and armoury, each with a lever or seal (the existing `obstacle()` helper with STR/DEX checks). Below them is the tomb of **Lord Varric, the Ironbound**, a wight knight who thinks you're one more thief with his Signet. |
| **Ending** | Beat Varric and put the Signet back: the dead sleep again. As he falls, Varric says *"Warden's blood... at last."* The tomb carvings show the Signet sealed a **door in the mountain pass**, and something beyond it has been pushing. The pass is the Act 3 hook. |

**Side quests:** Brannoc's Forge (find his tools in the keep's armoury), the goblin refugee camp outside Fenwatch (help them and a goblin trader opens, and it pays off in Act 3), Fenwatch's ferryman (treasure hints, like Old Tom), and a Megan subplot (perhaps her father was a Fenwatch archer).

### The region

Like Act 1 (the overworld plus the Deep Warrens), Act 2 is one outdoor map and one dungeon:

- **`src/world/ironvale.js`** (about 64 x 60): Greywater Fen in the south (reeds, shallow water, boardwalks, dead trees) with Fenwatch at its edge, the keep's outer walls in the middle, and the mountain pass in the north, blocked by a rockslide until Act 3. Zones: `fenwatch` (safe), `fen`, `keepGrounds`, `pass`.
- **`src/world/keep.js`**: the keep inside and the tomb. Zones: `keep`, `tomb`.
- **Getting there:** a back passage behind the King's throne climbs up to the fen ("the way the goblins came"). Once you're through, the **Iron Road gate** on the overworld's east edge opens from the far side as a permanent shortcut.
- **New tiles:** reeds, shallow water (walkable, slow), mud, boardwalk, dead tree, flagstone, rubble, broken wall, portcullis, scree, cliff. All baked neighbour-aware like the rest in `terrain.js`.
- **New music:** `fen` (slow, minor, triangle lead, heavy echo), `keep` (square lead, organ-like, sparse drums) and a `wight` boss track.

### Monsters and XP

Levels 5 to 8 take 6,500 to 34,000 XP. Act 1's monsters give 50-100 XP, so Act 2 needs SRD CR 1-4 monsters:

| Where | Monsters (XP) |
|---|---|
| Fen | lizardfolk (100), giant frog (50), ghoul (200), will-o'-wisp (450) |
| Keep | skeleton pairs (100), ghast (450), wight (700), helmed horror (1,100) |
| Bosses | Mother Sallow (700), Lord Varric (about 2,300; custom, like the Goblin King) |

Quest rewards of about 1,500, 3,000 and 5,000 XP cover about a third of the climb, and the bounty board (below) gives the rest a purpose. Add a battle simulator to `tools/` before tuning the bosses: the README quotes simulated win rates, but no simulator is in the repo.

## Act 3: The Pass (proposed)

Everything in this section is a **proposal** until the owner agrees it; the names are placeholders like "Ironvale" itself.

### The story in one breath

The rockslide in the pass wasn't nature. **Aldric Thorne**, a rune scholar, has learned to lift the Wardens' runes out of the old carvings and use them himself; every rune he takes is gone from the stone for good. He brought the mountain down behind him with a stolen Breaking Rune and is climbing to the door, taking the Wardens' magic as he goes. A voice on the other side of the door has been whispering to him through the runes, promising him the Wardens' power if he opens it.

His old apprentice, **Rachel**, came after him and got stuck at the rockslide. With her help the hero opens the pass, climbs it waystone by waystone, and learns from the ghost of the last Warden, who turns out to be family. At the top, in the Wardens' gatehouse, the hero beats Thorne. With his last stolen rune he cracks the door open. Something huge with a golden eye looks through the gap. The hero swears the **Oath** at the door, the runes light up again and the crack holds, for now. That is Act 4's hook.

### Main quests

| Quest | What happens |
|---|---|
| **Q6 The Scholar at the Rockslide** | Hild says the keep shook in the night. At the rockslide you find Rachel and her owl, Quill, camped in the snow and reading a rune burned into the rocks: a Breaking Rune, used from the far side. She can read it but can't undo it alone. She needs three rune-stones the blast threw down the slopes (a small hunt, like Megan's bow) and then the Wardenblade laid against the rune while she reads it backwards. The rocks split, and she joins you. About 4,000 XP. |
| **Q7 The Warden's Road** | Three **waystones** up the pass. At the first, the ghost of **Warden Colleen** appears. She's the last Warden, who held the door when the garrison fell, and "my blood" when she sees your sword. (Her son was sent south as a baby with the crested sword: that's how it reached Oakhollow.) Each waystone has a trial and teaches a rune. **Iron:** hold out for three rounds against Thorne's gargoyles; the reward is **Iron Ward**. **The Call:** keep your companion standing through a fight; the reward is **Warden's Call**. **Binding:** the stone is already stripped bare. Thorne got there first, so you track him to his camp on the heights and take the **Rune of Binding** back from his guardian. About 2,000 XP a waystone and 2,000 at the end. The first waystone makes you **Warden-in-training**. |
| **Q8 The Wardens' Gatehouse** | A fortress cut into the mountain in front of the door: the Act 3 dungeon. Rune doors, a frozen forge, the Wardens' barracks, then Thorne at the door with a **shield guardian** bound to his amulet (two monsters, so it fits the battle screen). He fights with stolen runes, including the Breaking Rune that hits everyone. When he's beaten, you choose: **spare him** (chained in the keep's cells, and he knows things about what's behind the door: Act 4) or **leave him to the mountain**. About 12,000 XP. |
| **Ending: The Oath** | Thorne's last rune cracks the door. Heat pours out, and a golden eye the size of a cartwheel looks through. Colleen: *"Now. Swear it, while I can still hold it."* The Oath screen (see the hero's arc). The door's runes light up again, the crack holds, and Colleen fades: *"Hold it better than I did."* Just before the crack closes, a voice from the other side shouts **"Rae?"**: Rachel's nickname, and Claire's first appearance. ACT 3 COMPLETE. |

**The rule for companion gates:** the main quest never *needs* a particular companion. Rachel joins as part of Q6, but once she's on the roster you can swap her out, and the main quest still has a way through for anyone (a harder check, a longer route). The *side* quests are where a particular friend is required, and that's what makes the roster matter.

### Rachel

**Proposed:** Rachel is the **wizard**: a bookish scholar of the Wardens with a dry sense of humour, too many books and an owl smarter than she is. For six years she was Thorne's apprentice. The worst of it, which she admits at a campfire: **she** worked out how to lift a rune from stone. He just used it. Stopping him is her personal quest, so it runs through the main quest.

Her stats: INT +3 casting, a staff, padded armour. She starts with Fire Bolt, Magic Missile, Shield and Sleep.

**Her new mechanics:**

- **A spellbook that grows.** Give Rachel a spell scroll and she *copies* it into her book for good instead of reading it once (50 gold of ink per spell level, as in the SRD). Scrolls finally have a second use, and the pass, the gatehouse and the keep's library hide new ones: Burning Hands, Misty Step, Fireball, **Counterspell**, Lightning Bolt. This needs a book view on her companion page.
- **Arcane Recovery.** A short rest at a camp gives her one spell slot back, so camps matter to her as well as inns.
- **Quill the owl.** Quill follows her on the map as a second little sprite. In battle, once per fight, a **FLYBY** gives the hero advantage on their next attack (the SRD Help action). At a camp, **SEND QUILL** marks the zone's unopened chests and secrets on the world map.
- **Reading runes.** Warden carvings sit all over the game, Act 1 and 2 maps included (the Deep Warrens, the keep, Willowmere's old garden). Without Rachel they're "worn carvings you can't read". With her they give up lore, hidden caches, and in the gatehouse the answers to the rune doors.
- **COUNTER.** When an enemy caster starts a spell (Thorne, the night hag, later Act 4), a COUNTER button lights up on Rachel's turn bar if she has a 3rd-level slot. It stops the spell automatically if the spell is 3rd level or lower; above that, she needs a check. It's the first time a companion acts *outside* their turn.

### The companions, deeper

**Campfire talks (new mechanic).** When you rest at a camp or in your bed at the keep, and the companion with you has something to say, a short scene plays. It's one talk per rest, three per companion in Act 3, and each needs a story flag (so nobody spills everything on the first night). After a companion's third talk, their personal quest opens. Companions also get one-line **remarks** at key places, like walking into the pass (Megan: *"I'm not looking down. Don't make me look down."*).

| Companion | What the talks reveal | Their quest (needs them in the party) | Reward |
|---|---|---|---|
| **Megan** | Her da, Corwin, was a Fenwatch archer who went up the pass with a survey party ten years ago and never came back. She's afraid of heights. Her bow was his. | **Corwin's Arrows.** Arrows with his fletching mark lie along the pass, but only Megan recognises them. They lead to an old Warden watchtower where Corwin has lived as a hermit since the survey party was lost, hunting griffons. He shoots at strangers and only comes out for Megan. | Corwin teaches her **Volley** (one shot at each monster, once per fight). Corwin moves into the keep and runs archery rematches in the training yard. The watchtower becomes a camp. |
| **Robyn** | She was left on the shrine's step as a baby. For years her prayers felt unanswered, until the night you laid the graves to rest. The light she prays to has an old name: the Wardens' **Dawn**. | **The Frozen Chapel.** A Warden chapel high on the pass, full of wraiths. Only Robyn can consecrate it. | Robyn learns **Turn Undead** and **Spiritual Weapon**. The chapel becomes a camp. Her lines hint at the Oath of Dawn. |
| **Rachel** | The college, Thorne as he used to be, what she worked out about runes, and why Quill won't go near Thorne. | Her quest *is* the main quest. In the final fight, with her in the party, Thorne hesitates the first time she speaks (he loses his first turn), and sparing him gets a line from her. | Thorne's notes go to the keep's library: more scrolls for her book. |
| **Brannoc** (not a companion) | | **Rune-Iron.** The gatehouse's frozen forge still has rune-iron in its ore bins. Bring him some. | The **Wardenblade's second form**: one more rune slot. (The final form is Act 4.) |

Claire is Rachel's twin and joins in Act 4; her hints in Act 3 are under **Companions: Claire, Rachel's twin**.

### Choices come back

- **Mother Sallow, if you made the bargain:** she wore the Goblin King's crown, decided she's **Queen of the Fen**, and charges a toll on the causeway (one copper, then a song, then a pretty pebble). Fenwatch asks you to sort it out. You can bargain again with something shiny from Thorne's camp, or fight a crowned Sallow who's tougher than before. Either way she then turns up at the rockslide camp as **Sallow's Sundries**, the pass's only pedlar, selling cold charms at hag prices.
- **Mother Sallow, if you fought her:** her sister **Auntie Nettle** (the SRD night hag, played comic: *"You killed my sister? She owed me money."*) haunts the pass at night. Short rests at the pass's camps keep getting interrupted until you find her lair and beat her. COUNTER matters in this fight.
- **The goblin refugees** (the Act 2 side quest that isn't built yet, so it comes first): if you helped them, they remember the old Warden mine tunnels under the pass. **Snik** guides you through a shortcut round the hardest slope to a hidden cache, and their trader moves into the keep's courtyard. If you didn't help, there's no shortcut.
- **Thorne, if spared (decided: it matters in Act 4):** chained in the keep's cells. He has a line for every visit, and in Act 4 he knows the voice behind the door and can help against it. Leave him to the mountain and Act 4 goes on without that help.

### Going back: what's new in the old places

Once Act 3 begins (`bladeReforged` and `keepHome`), the places from Acts 1 and 2 change. The aim is to be fun, not to make you grind.

- **Weak monsters sometimes run away (decided).** In a zone where you're five or more levels too strong, about half the encounters end at once: *"A wolf takes one look at the Wardenblade and bolts."* You get a few XP and no fight. The rest still fight, so the old places never feel empty.
- **Pip and the Junior Wardens.** Pip has a wooden "Wardenblade" and has signed up the village kids. Then he runs away to be a Warden like you. **Pip's Big Adventure:** follow his trail through the wood to the empty Deep Warrens, where he has found something new: **kobolds** digging, scouting "for the Great One beyond the mountain". It's the first plant for Act 4's dragon. The kobolds aren't a real fight at your level; Pip is fine, just very proud. His reward is his Junior Warden badge (a trinket: +1 to your next failed save each rest). After that, Pip's lines follow the act.
- **Oakhollow:** a (lumpy) statue of you in the square, built by Pip, which improves over time. The Sleeping Fox has a "The Hero Slept Here" plaque, and a travelling bard sings a terrible song about you that uses your name and title. Hazel has a letter for you. Elder Maren has the old **Warden's Oath** in three pieces in her books, which is lore for choosing your Oath.
- **Willowmere:** Old Tom says **Old Gnasher**, a legendary pike, only bites now. It's a rare catch in the fishing minigame, and Tom pays handsomely and mounts it.
- **The Deep Warrens and the keep:** Warden carvings that Rachel can read (see her mechanics), each with lore or a hidden cache.
- **Goblin Rocks:** if you helped the refugees, they move back home and the camp turns into a little goblin village.
- **Fenwatch:** the ferryman (an Act 2 gap) finally runs, with treasure hints for the fen and the pass. The Drowned Duck has rumours about the pass and new bounties. Sallow's toll trouble starts here (above).
- **The keep fills up:** Rachel's **rune library** (scrolls for her book, rune lore), the **training yard** (minigame rematches with better prizes), **Corwin's** room, the goblin trader, and the **cells** if you spared Thorne.

### The region

- **`src/world/pass.js`** (about 48 x 80, tall): the rockslide and Rachel's camp at the bottom, pine slopes, snowfields, the heights (Thorne's camp), the waystones up the old Warden road, Corwin's watchtower, the Frozen Chapel, and the gatehouse's face at the top. Zones: `slopes`, `snowfield`, `heights`, `gatehouseApproach`. The `pass` region in `REGIONS` gets its `map`.
- **`src/world/gatehouse.js`**: the dungeon. Zones: `gatehouse`, `door`.
- **Camps:** the rockslide (Rachel's camp), each waystone once its trial is done, the watchtower (after Corwin), the Frozen Chapel (after Robyn). The hub is still the keep.
- **New tiles:** snow, deep snow (slow), **ice** (decided: in. You slide until you hit something: the pass's puzzles, in short stretches so the joystick stays comfortable), pine, scree, cliff, rope bridge, waystone, rune door.
- **New music:** `pass` (high, cold, sparse bells), `gatehouse` (low, heavy, the keep's organ in a minor key), and a `thorne` boss track.

### Monsters and XP

Levels 9 to 12 run from 48,000 to 100,000 XP, so from the end of Act 2 (about 34,000) there are about 66,000 to earn. Quest rewards come to about 26,000 (Q6 4,000, Q7 8,000, Q8 12,000, plus the trials), companion quests are about 3,000 each, Pip's is 1,000, Sallow's or Nettle's about 2,000, and the rest comes from fights and bounties. Fights still come one or two monsters at a time.

| Where | Monsters (XP) |
|---|---|
| Slopes | griffon (450), manticore (700), ettin (1,100) |
| Snowfield and heights | troll (1,800), wyvern (2,300), stone giant (2,900) |
| Waystones (Thorne's guards) | gargoyle pairs (450), earth elemental (1,800) |
| Frozen Chapel | wraith (1,800), specter pairs (200) |
| Gatehouse | helmed horror (1,100), chimera (2,300), the Wardens' old shield guardians (2,900) |
| Bosses | Auntie Nettle, the night hag (1,800), crowned Sallow (about 1,800), Aldric Thorne (about 5,000; custom, with his shield guardian) |

No dragons in Act 3: the eye at the door is the only one you see. Use `npm run sim` to tune Thorne before he's merged, as with Varric.

### The hero in Act 3

- **Fighter levels 9-12** (SRD Champion): **Indomitable** at L9 (reroll a failed save once per long rest), **Extra Attack (2)** at L11 (three attacks; the Potion of Dexterity makes it four), an ability score increase at L12. The Champion's extra Fighting Style at L10 is a pick on the LevelUp screen (Defense +1 AC, or Dueling +2 damage).
- **Runes:** Iron Ward (a reaction: when a hit would land, spend a slot for +5 AC, which can turn it into a miss; it pops up as a prompt), Warden's Call (heals the hero and companion and ends fear and paralysis), Rune of Binding (a CON save or the monster loses its next turn, using the conditions engine). The **Breaking Rune** is the one Thorne uses on you; the hero learns it in Act 4.
- **Titles:** Warden-in-training (first waystone), then the Oath's title at the end of the act (e.g. *Sworn of Iron*). *Warden of Ironvale* waits for Act 4.
- **Looks:** the cape from Act 2, the blade's runes glowing (one more per rune), and the Oath's colours after the ending.

## Act 4: Beyond the Door (proposed)

Everything in this section is a **proposal** until the owner agrees it. The names (the dragon, the land beyond, the new people) are placeholders like "Ironvale" itself. Some of it is already **decided** elsewhere in this file (Claire, the whole-party final fight, the Oath paths, Thorne mattering), and this section builds on those.

### The story in one breath

The Wardens kept two homes: Ironvale Keep on this side of the mountain, and **Lastwatch** beyond the door, in a green valley called the **Emberreach**. A hundred years ago a red dragon, **Vorthax** (placeholder), woke under the Emberreach's mountain, and the garrison fell. Warden **Colleen** carried their baby son out through the door and sent him south with the crested sword (built: her line at the first waystone). Her husband, **Matt**, the Wardens' captain, stayed at Lastwatch with their four baby daughters. Then Colleen sealed the door to keep the dragon in.

**The seal froze the valley in time** (decided). Everything beyond the door stopped: the dragon, the fires, Matt and the girls. Colleen held it for the rest of her life and after, as a ghost, knowing her husband and daughters were caught inside with the thing she was holding back. That's what "Hold it better than I did" meant.

About **twenty-five years ago the seal started to fail.** Gaps opened at the foot of the door ("it wasn't sealed so tightly then"), and time beyond the door started again. The dragon woke with it, began whispering through the runes to anyone who could read them (Thorne), and sent its kobolds to dig the long way round (the ones Pip found in the Warrens). Matt got his daughters out through the gaps one at a time, wherever he could:

- **Rachel and Claire**, the twins, to a family in the foothills.
- **Robyn**, to the step of Fenwatch's shrine, with a candle from the Wardens' shrine of the Dawn beside her (built: "with a candle beside me").
- **Megan**, into the arms of a Fenwatch archer who raised her as his own: her **da**, **Corwin** (built as Matthew in 0.35.0, renamed in 0.39.1). He's still her da, so everything she's said about him stays true. The survey party that took him up the pass ten years ago was really him looking for where she came from.

**Claire** went back through a gap at twelve, chasing a wolf cub, and has lived with Matt ever since. She grew up wild in the wildwood while he held Lastwatch alone against the dragon's undead. She knows the whole story, which is why she knows everyone's missing piece. The hero descends from the son Colleen sent south, so the four companions are the hero's family: great-aunts several times over, kept young by the frozen years.

Since Thorne cracked the door, the seal is failing for good: the crack glows at night and the keep's runes flicker. The hero, now sworn to an Oath, goes **through the door**, finds Claire, then **Matt**, alive, and learns who the four companions really are. Each sister finds the piece of her story that was left beyond the door and pledges to stand at the last fight. Then the party climbs into the **Emberdeep**, the dragon's mountain, and faces Vorthax together. When it falls the seal isn't needed any more: Colleen comes back one last time, to her husband and daughters, and the hero comes home as the **Warden of Ironvale** with the door standing open.

### Main quests

| Quest | What happens |
|---|---|
| **Q9 Through the Door** | The crack in the door is wider every night, and kobolds have started coming out of the Warrens' tunnels. Rachel (or Hild, if she's not with you) works out that a Warden can open the door from this side and the runes will close it behind them. At the door the hero lays the Wardenblade against it, the three runes light up, and the door swings open onto heat and ash. On the far side: the **Threshold**, the Wardens' old gate-camp, burned out (it becomes the first camp). The voice that shouted "Rae?" left tracks. A kobold warband ambushes you on the ash road, and a wolf pack drives them off and leads you to the edge of the wildwood. About 10,000 XP. |
| **Q10 Two Halves** | Claire's recruit quest, the reunion. She's wary: the dragon has used voices before, and she won't believe Rachel is real. The proof is the charm: Rachel's moon half and the sun half from the pass's cairn. When the halves touch, the dragon's brood attacks the grove (a young red dragon and a fire elemental), and the twins fight beside you: **the first battle with two companions**. Afterwards the charm is whole (a key item) and Claire joins, with one line that stops Rachel cold: *"Come on. Father will want to see you."* If Rachel isn't in your party she comes along as a **guest** for this quest, so the main quest still needs nobody in particular. About 6,000 XP. |
| **Q11 Lastwatch** | Claire leads you to Lastwatch, the burned Warden outpost, where her father has held out for twenty-five years. The way in is through the **Cinder Wardens**, Matt's own fallen Wardens, raised by the dragon. **Matt** is grey and lame and still holding the gate. He knows the sword at once: *"Colleen's. Then the boy made it south."* He tells the whole story: the frozen years, the gaps, where he sent each girl. Rachel, Megan and Robyn hear it from him if they're with you, and from the hero at the keep if not (each gets a scene). He teaches the hero the **Breaking Rune** (Thorne's old rune: it hits every monster) and tells you the dragon's **true name**, which Frightful Presence can't stand against. About 8,000 XP. |
| **Q12 The Emberdeep** | The dragon's mountain: the Act 4 dungeon. The kobolds' tunnels, the brood's aeries, golems the Wardens built and the dragon took, and the **hoard**. Brannoc's lost forge is on the way (the Wardenblade's final form). Dunstan's map (Megan's pledge) shows a back way that skips the golems; the goblin refugees' Snik knows one too. About 15,000 XP. |
| **Ending: Vorthax** | Vorthax in three phases with the whole party (see The last fight). When it falls, the Emberreach's fires go out one by one and the wildwood starts to cross the ash. The seal isn't needed any more, and **Colleen** steps out of the door's light one last time: to Matt, to her daughters (she tells Rachel she knew her at the very first waystone, and kept quiet so she'd finish what she came to do), and to the hero: *"My blood. I told you to hold it better than I did. You did."* Then she's gone for good. Back at the keep everyone is in the hall: Matt, the sisters, Hild, Brannoc, Megan's da, the goblin trader, Pip with his wooden sword. Hild hands you the keep's keys: **Warden of Ironvale**. ACT 4 COMPLETE, the credits, and then free play (below). About 18,000 XP for the dragon. |

**The rule for companion gates still holds:** the main quest never needs a particular companion (Rachel joins Q10 as a guest if she has to; the others hear Matt's story at the keep if they weren't there), and the pledges are where each sister matters.

### Matt

The Wardens' captain, Colleen's husband, the four companions' father and the hero's forefather. He went into the frozen years in his thirties and has lived twenty-five more since they ended: grey, scarred, one leg stiff, still in Warden plate. Gruff, funny when he forgets to be sad, and not used to company. He isn't a companion (he won't leave Lastwatch while the dragon lives), but after Q11:

- **Lastwatch is a camp**, and Matt is there: talk to him with each daughter in your party for her own scene, and he has a line for every Oath (Iron reminds him of Colleen).
- **He trains you:** the Breaking Rune in Q11, and a sparring rematch at Lastwatch, like the keep's training yard.
- **At the last fight** he holds the hoard's door with the wolves while the party goes in, so nothing gets behind you (no mechanic: a scene).
- **After the ending** he moves into the keep, and Colleen's old room is his.

### Claire

The decided parts are under **Companions: Claire, Rachel's twin**. What Act 4 adds:

- **Her stats:** WIS +4 casting, a quarterstaff, hide armour, good saves (WIS and INT proficient, as an SRD druid), and she starts at the hero's level like the others. Spells: Produce Flame, Entangle, Faerie Fire, Cure Wounds, Moonbeam, Call Lightning and Conjure Animals.
- **Wild Shape:** twice per rest she becomes a **bear** (hits hard, about 60 HP of its own) or a **great cat** (two attacks, quicker to act). The beast's HP is a second bar under hers; when it runs out she turns back with her own HP untouched. In beast form she can't cast. (SRD druids can't take a beast this big at her level without the Circle of the Moon, which isn't in the SRD: a bend, like scrolls for anyone.)
- **Conjure Animals** is a wolf pack that bites each monster once at the end of every round for three rounds, not new fighters on the screen (the screen has no room). **Moonbeam** and **Call Lightning** last their rounds like Bless (no concentration yet).
- **Hearing the land:** with her in the party, beasts won't attack (wolves, apes and the like walk away instead), hidden paths show up on the Emberreach map, and some animals have something to say (a raven who knows where the survey party's camp was).
- **Breaking curses:** her touch ends charms and curses after a fight (the night hag's, the dragon's Frightful Presence lingering), and she rolls her saves with advantage against magic.
- **Rally:** in the last fight, once per phase she brings a fallen companion back with a little HP.
- **Her talks:** three campfire talks like the others (growing up wild with their father, Rachel as a girl, what the dragon whispered to her), and she's the one companion who wants to talk to **Thorne** in the cells.

### The sisters' pledges

Each ends with the sister (or Brannoc) pledging to stand at the last fight. A pledge shows as a **banner** in the keep's hall. Each sister's quest is also her finding out where she came from.

| Who | What's waiting beyond the door | The quest | Reward |
|---|---|---|---|
| **The hero** | Matt, alive | Main quest (Q11) | The **Breaking Rune**; the dragon's true name |
| **Rachel** | Claire herself | Q10, Two Halves | The charm, made whole: while either twin is in the party, the other can be tagged in during any fight once per rest |
| **Megan** | **Dunstan**, her da's old survey partner, alive and kept by the kobolds to draw their maps | **The Mapmaker.** Free him from the kobolds' diggings. He was with her da when he went looking for where his foundling came from, and he carries a letter her da wrote her and never got to send. Matt tells her he named her after his mother. | Dunstan's **map** (the Emberdeep's back way) and three **Arrows of Dragon Slaying** for Megan (SRD: CON save or 6d10 more) |
| **Robyn** | The **shrine of the Dawn**, the first one, where the candle on her step came from | **The First Light.** The dragon's undead have made it a lair. Robyn relights the shrine's lamp and has to hold the light while you fight (a `surviveRounds` trial, like the waystones). The light she prayed to was her family's all along. | **Mass Healing Word** (heals everyone in the party at once) |
| **Claire** | | No quest of her own: she's the one bringing everyone together. Her pledge comes when the last of her sisters pledges. | Her **rally** in the last fight |
| **Brannoc** (not a companion) | The Wardens' **lost forge**, inside the Emberdeep | Part of Q12: bring him to it once the way is clear, with the charm's light to read the forge's runes. | The **Wardenblade's final form** (one more rune slot, and it shrugs off fire: half fire damage while you hold it) |
| **Megan's da, Snik, Pip** (not companions) | | No pledge quest. If you finished Corwin's Arrows or helped the refugees, they turn up at the keep for the ending. | Lines and a place in the hall |

### Thorne, if spared (decided: it matters)

He knows the voice. He spent years listening to it through the runes, and he knows how it reaches through them. Visit the cells in Act 4 and he tells you how to turn the door's own runes against it: at the start of the last phase the door's runes **bind** Vorthax for one round. Without Thorne you still have Matt's true name (Frightful Presence fails either way), just not the binding. Thorne also knew more than he said: *"I told her I'd find her sister. I didn't tell her I'd worked out who their father was."* Claire's talks with him are the one place he apologises. After the ending he asks to be let out to help rebuild the Emberreach: an open question whether you can say yes.

### The Oath paths

Each Oath opens one path in the Emberreach (decided in The Oath). Each leads to an **Oath vault**: a Warden cache with a piece of Oath gear.

| | **Iron** | **Storm** | **Dawn** |
|---|---|---|---|
| Path | Hold up the collapsing bridge over the lava gorge while the party crosses (a STR trial: three checks in a row) | Blink across a chasm to the vault on the far side | Walk through the cursed gate at Lastwatch, which burns anyone else |
| Vault | The Wardens' tower shield (+2 AC, fire resistance while you use it) | A storm-glass rune stone (Chain Lightning hits once more) | The Dawn banner (the healing light also works on a guest or second companion) |

### Choices come back (last time)

- **Sallow's Sundries:** the bargained Sallow sells Potions of Fire Resistance at hag prices, and later a "dragon-proof" hat that does nothing.
- **The goblin refugees:** Snik knows the kobolds' tunnels into the Emberdeep (a second back way). The goblins are at the ending.
- **Pip:** stows away through the door in Q9 and is found by Claire's wolves, very proud of himself. She sends him home with a wolf to guard him; after that he tells every child in Oakhollow about the wolf.
- **Old places:** new Act 4 lines for the hubs (Maren on the Wardens' homeland, the bard's song gets a dragon verse), and Act 3 bounties stay on the boards with Act 4 ones added.

### The region

- **`src/world/beyond.js`** (about 64 x 72), the Emberreach: the door's far face and the Threshold camp in the south; the **ash road** and lava gorge; the **wildwood** in the west (Claire's grove, a camp once she joins); the burned outpost of **Lastwatch** in the east (Matt's hold, the shrine of the Dawn); the kobold diggings; the brood's **aeries** in the north; and the Emberdeep's gate under the mountain. Zones: `threshold` (safe), `ashRoad`, `wildwood`, `lastwatch`, `aeries`, `emberGate`. The `beyond` region in `REGIONS` gets its `map`.
- **`src/world/emberdeep.js`**: the dungeon. Zones: `tunnels`, `forge`, `hoard`.
- **Camps:** the Threshold, Claire's grove, Lastwatch (after Q11), the lost forge (after Brannoc). The hub is still the keep: the door is a short walk from the gatehouse, and a fast-travel point on each side.
- **New tiles:** ash, cinders, obsidian, lava (blocks, like deep water), burned tree, giant wildwood tree, standing stone, the door's far face, a crumbling bridge.
- **New music:** `emberreach` (warm and wide, low horns), `wildwood` (the woods' track with a drone underneath), `emberdeep` (the gatehouse's organ, slower and hotter), and a `dragon` boss track with three sections, one per phase.

### Monsters and XP

Levels 13 to 16 run from 120,000 to 195,000 XP, and the end of Act 3 is about 100,000. Quest rewards come to about 54,000 (Q9 10,000, Q10 6,000, Q11 8,000, the pledges 5,000 each, Q12 15,000, the Oath vault 3,000), and the dragon about 18,000; the rest comes from fights and bounties, so a hero who does everything reaches level 15 before the Emberdeep and 16 with the dragon. Act 4 monsters hit at +11 to +14 with about a third more HP than the SRD, like Act 3's. Fights are still one or two monsters.

| Where | Monsters (XP) | Falls to / tests |
|---|---|---|
| Ash road (built) | hell hound pairs (700), and salamanders (1,800) and fire elementals (1,800) always with a hound or each other; the kobold warband is a scene, not a fight | Iron and Dawn (hell hounds) / Iron (the elementals' fire) |
| Wildwood (before Claire) | giant ape (2,900), werewolf pairs (700), the treant (5,000, only if you attack it) | Iron / Dawn (beasts) |
| Lastwatch | Cinder Wardens (Matt's fallen Wardens: custom wights with fire, about 1,800), vampire spawn (1,800), mummy pairs (700) | Dawn / Storm (they soak spells) |
| Aeries | young red dragon (5,900), roc (7,200) | Storm (flyers) / Iron (breath) |
| Emberdeep | fire giant (5,000), clay golem (5,000), stone golem (5,900), young red dragon (5,900) | Iron (giants, golems) / Storm (golems) |
| Bosses | Vorthax (about 18,000 across three phases; custom, from the SRD adult red dragon) | All three, if the party covers the gap |

### The last fight

Vorthax is built from the SRD **adult red dragon** (AC 19, bite +14 with fire, two claws, Frightful Presence, a breath weapon of 18d6 fire, DC 21 to halve) with its HP spread over three battles that run back to back. Between phases you **tag in** any pledged companion for either of the two places beside you; there's no rest, but Claire's **rally** works once in each phase.

1. **The Sky:** Vorthax on the wing. Melee attacks on a flying monster have disadvantage; bows, spells and runes don't (Megan and Rachel shine). It ends when a wing tears.
2. **The Ground:** on the ground with one of its brood (two monsters). Its breath **recharges** on a 5 or 6 each round instead of a fixed number of uses.
3. **The Hoard:** in the hoard, wounded and furious. **Lair actions:** at the top of each round the floor erupts somewhere (a DEX save for fire). **Legendary resistance:** three times it turns a failed save into a success, so Binding and Sleep need to wear it down. With Matt's true name Frightful Presence fails, and with Thorne's help the door's runes bind it for the first round.

Tune with `npm run sim` before merging. Targets: a level 16 hero with two companions and +5 gear wins about 90% of the time; with only Claire and one other, about 70%.

### The hero in Act 4

- **Fighter levels 13-16** (SRD Champion): **Indomitable** twice per long rest (L13), ability score increases (L14 and L16), **Superior Critical** (L15: crits on 18-20).
- **Runes:** the **Breaking Rune** (every monster, a DEX save halves it), the Oath's signature at full power (one more use per rest), and the Wardenblade's final form with one more rune slot.
- **Title:** *Warden of Ironvale* at the ending, replacing the Oath title in NPC lines (the Oath title stays on the hero sheet).
- **Looks:** the blade's last rune lit, and the Oath vault's gear on the sprite (the shield, the sparks, or the banner on the cape).

### After the ending: free play

The game doesn't stop at the credits. The Emberreach stays open, its fires out, with the wildwood slowly spreading over the ash (the map's ash tiles turn to grass over the next few visits). The bounty boards keep their hunts, the training yard keeps its rematches, and Pip finally gets a real (small) sword. Whether there's anything past level 16 is an open question.

## Safe places, resting and travel (decided)

### Hubs and camps

| | **Hub** (one per act) | **Camp** (a few per region) |
|---|---|---|
| Examples | Oakhollow (Act 1), Fenwatch (Act 2), Ironvale Keep (Act 3+) | Old Tom's hut, a campfire at Goblin Rocks, the Keep Gate |
| No monsters | yes | yes |
| Rest | long rest at the inn, **costs gold** | short rest at the campfire, free |
| Fast travel from here | yes | yes |
| Shops, bank, tavern | yes | no (perhaps one pedlar) |
| Side quests, minigames, companions | yes | no |

- **Fast travel only works while standing in a hub or a camp**, to any hub or camp you've found. No more travelling from anywhere outdoors.
- **Homeward Feather** (consumable, about 50 gold): takes you to your last hub from anywhere outdoors, but not underground.
- **Walking into Oakhollow no longer heals you.** Rest at an inn instead.
- **Old Tom's bed stays free** (a long rest), a kindness to Act 1 players.
- **Fainting** wakes you at your last hub's inn (free, you were carried in), still losing half the gold you carry (at most 50). Uses a new `state.lastHub` instead of always the Oakhollow spawn.
- **The bank is one account** across every hub (`hero.bank` already works this way).
- Each hub's shops sell what suits its act rather than copying Oakhollow: Oakhollow keeps the basics (smith up to +3, the apothecary); Fenwatch has Brannoc's forge (up to +5, silvering, Splint AC 17, Plate AC 18 at 1,500 gold), Greater Healing and the tavern.
- Hubs change as the story moves on: new lines, maybe a statue of you in Oakhollow.

### Short and long rests

| | **Short rest** (camp) | **Long rest** (inn, Old Tom's bed) |
|---|---|---|
| Cost | free | gold (about 10 in Act 1, about 25 in Act 2) |
| HP | half your maximum | full |
| Second Wind, Action Surge | back | back |
| Spell and rune slots | no (perhaps a little, like the wizard's Arcane Recovery) | all back |

### Fenwatch, the Act 2 hub

A stilt-town on boardwalks at the edge of the fen.

- **The Drowned Duck**, the tavern: a rumour and **bounty board** (repeatable hunts, e.g. "clear 4 ghouls from the causeway: 300 gold, 600 XP"), long rests for gold, the companion roster, and a dice table.
- Brannoc's Forge (once he's rescued), a bank branch, and a fen herbalist (potions).
- The goblin refugee camp at its edge.

### Minigames (built in 0.30.0, all four in one go)

Quick to play with taps, each with a one-off reward so they aren't a gold farm:

- **Knucklebones** (dice, at the tavern), using the dice engine. Prize: a Lucky Die trinket (reroll one natural 1 per rest).
- **Arm wrestling** (STR contest with timed taps). Prize: a belt that adds STR.
- **Archery contest** (Megan's, timed taps). Prize: a new bow for her.
- **Fishing** at Willowmere and Fenwatch (Old Tom could run it). Rare fish sell well or cook into food.

As built: the rules are `src/rules/minigames.js` (tested), the screens `src/scenes/minigames.js`, and the hosts' conversations `src/story/minigames.js` (a `minigame` event opens a screen). They're all reachable in Act 1 (the Sleeping Fox, Oakhollow, Willowmere) so they don't wait for the keep; the keep's training yard can host rematches later. Knucklebones has a 10-gold stake; fishing stops after five catches per rest; prizes are `prize: true` (never sold). Fish don't cook into food yet. Simulated: a careful archer beats Megan's 34 about 60-80% of the time; at arm wrestling, catching the green on most passes wins, and mashing loses.

## Companions

**Decided:** one companion in the party at a time; the rest wait on a **roster** you can swap at any inn (later, at the rebuilt keep). `party.js` already keys companions by id in `COMPANIONS`, so `hero.companion` stays the active slot and a new `hero.roster` holds the others.

**Decided: companion control is option C.** Companions act by themselves, each with a **TACTICS** switch (Attack / Heal / Save Magic), and you can tap a companion to take over their turn.

Companions to add:

- **Megan** (built): the archer. Keeps her place.
- **Claire, Rachel and Robyn**: the owner wants all three. **Rachel is planned for Act 3** (the wizard; see Act 3). **Robyn is built (0.26.0):** a cleric from Fenwatch's shrine, recruited through The Restless Dead. **Claire** is Rachel's twin, a druid, and joins in Act 4 (see below).
- **Candidates:** Brannoc (dwarf tank with a warhammer; *protect* gives you disadvantage against the next hit), Snik (goblin scout; *sneak attack* adds damage to a target someone else has already hit), Wren (fen herbalist who heals instead of attacking).

### Claire, Rachel's twin (decided: she joins in Act 4; the hints start in Act 3)

**Decided:** Claire is Rachel's twin sister, her opposite in everything, like the two halves of a yin and yang. Act 3 only hints at her. She joins in Act 4, beyond the door, and she's the one who **brings every companion together** for the dragon.

| | **Rachel** | **Claire** |
|---|---|---|
| Sign | The moon (her half of a broken charm) | The sun (the other half) |
| Magic | Learned from books: a wizard (INT), spells copied into a spellbook | Instinct: a **druid** (WIS), spells from wild places, and she can't read a word |
| In a fight | At the back, fragile (padded armour) | **Up close**, the first companion who is: **Wild Shape** turns her into a bear or a great cat with its own HP bar, and she turns back when it runs out |
| Animal | Quill, an owl (night) | No pet: she *becomes* the animals, and wild beasts won't attack while she's with you |
| Around the world | Reads runes and carvings | Hears the land: finds hidden paths and talks to animals (an animal can be a quest-giver) |
| Against magic | COUNTER stops spells | Shrugs them off (good saves) and breaks curses and charms |
| Around people | Quiet and solitary; trusts books more than people | Loud and warm; collects friends wherever she goes |

**The story:** the twins grew up near the foothills. When they were twelve, Claire chased a wolf cub up the pass, went through a gap at the foot of the door (it wasn't sealed so tightly then) and never came back. Rachel has spent her life on runes for one reason: to open a way through. That's how Thorne got her to work for him: he promised to find her sister. Claire has spent the years beyond the door living wild, and she knows that land the way Rachel knows books.

**Hints in Act 3** (none of them names Claire until the very end):

- **Rachel's campfire talks:** "My sister would have climbed this without a rope." Later: "She'd have liked you. She liked everyone. I never understood how." In the third talk she admits *why* she studies runes, without saying "twin".
- **The broken charm:** Rachel wears half of a moon-and-sun charm. In the pass you find a cairn of animal bones with the **sun half** wound into it, years old. Rachel goes very quiet. It's a key item that goes back together in Act 4.
- **Corwin at the watchtower:** "A girl came down the pass once, years back. Wild hair, a wolf pelt, ran with the pack on all fours. Had your face, scholar." Rachel brushes it off.
- **Animals that help:** once on the heights, a wolf pack drives off the monsters attacking you and then vanishes. Someone sent them.
- **Thorne, if spared:** "I told her I'd find her sister. I wasn't lying, Rachel. I just wasn't going to stop there."
- **The last line of Act 3:** as the crack in the door closes, a voice from the other side shouts **"Rae?"** Rachel's nickname. (If Rachel isn't in your party, she hears about it at the keep and comes running.)

**Bringing everyone together (Act 4):** Claire gathers the whole cast the way Rachel never could.

- **Her recruit quest is a reunion:** find the twins' lost charm halves and put them back together. That's when she joins.
- **She knows everyone's missing piece.** Beyond the door she has met something tied to each companion's story: Megan's da's old survey partner, the shrine of the Dawn for Robyn, the Wardens' lost forge for Brannoc, and for the hero, their father **Matt**, alive (decided: Claire, Rachel, Megan and Robyn are sisters, Colleen and Matt's daughters; see Act 4). She leads each companion to theirs, one quest each, and each one ends with that companion pledging to stand at the final fight. That makes every companion's story pay off before the end.
- **The final battle is the one fight with the whole party.** Normally it's one companion at a time; for the dragon, everyone you've recruited comes. Two stand beside you at a time (the battle screen needs room for a second companion: Act 4 work) and you can tag in the others between the dragon's phases. Anyone you never recruited isn't there, so recruiting everyone is worth it. Claire's **rally** brings a fallen companion back once per phase.
- **The roster screen remembers:** every pledge shows as a banner in the keep's hall, so you can see who's coming.

**Build notes for Act 4:** a battle screen with a second companion, Wild Shape (a second HP bar on a companion), druid spells (Produce Flame, Entangle and Faerie Fire are already in `spells.js`; she'd add Moonbeam, Call Lightning and Conjure Animals), and `art/claire.js` with a bear form as well.

## Magic

Companions can be wizards and other casters; the hero gets magic of their own through Warden runes (below). Both use the same engine.

- **Cantrips:** unlimited; damage grows at levels 5, 11 and 17 (Fire Bolt, Sacred Flame).
- **Spell slots:** a number per long rest by level, from the SRD tables (slot levels 1-4 cover levels 1-8).
- **Spells known:** about 4-6 per caster, picked at level-up or found (spellbooks in chests, a tutor in a hub).
- **Scrolls and wands for anyone:** any character can read a scroll once (Scroll of Fireball, Scroll of Cure Wounds), a fun bend of the 5e rules. Wands have a few charges that come back at a long rest.

| Class | Spells | Why it suits Ironvale |
|---|---|---|
| Wizard | Fire Bolt, Magic Missile, Sleep, Burning Hands, Shield, Misty Step, Fireball at level 5 | Burst damage; hitting every monster at once is new |
| Cleric | Sacred Flame, Cure Wounds, Bless, Healing Word, Spiritual Weapon, Turn Undead | Built for Act 2's skeletons and wights |
| Druid | Produce Flame, Entangle, Goodberry, Moonbeam | Suits the fen |
| Bard | Vicious Mockery, Healing Word, Faerie Fire, Hypnotic Pattern | Helps the party; could tie into the tavern |

**New rules engine work:** saving throws against a spell's DC; spells that hit every monster in the fight; conditions (asleep, held, blessed, turned) that also cover ghoul paralysis; healing allies in battle and from the bag; slots saved with each caster and refilled by rests.

## The hero's arc: from traveller to Warden of Ironvale

**Decided:** the hero is the main character and grows over the whole game into the most powerful person in the land. Power comes from the story as well as from levels.

**The secret (open: see questions):** the hero is the last heir of the **Wardens**, who held the door in the pass with rune magic woven into iron. The line was thought dead.

- **Act 1 plant:** the hero's starting longsword gets a worn crest on its pommel. Nobody mentions it yet.
- **Act 2, the discovery:** the Signet doesn't curse the hero. Brannoc sees the sword: *"Where did you get this? That's Ironvale steel."* Varric names the blood as he falls. Brannoc reforges the sword into a **named blade that grows with the story**. The first rune.
- **Act 3, training and choice:** a mentor at the pass door, a rival who wants the Wardens' power, more runes, and the **Oath**.
- **Act 4, mastery:** the Oath at full power, the sword's final form, and the hero rules Ironvale Keep as its Warden.

### Fighter features (levels 2-8)

Today the hero has only Second Wind. Add, from the SRD fighter (Champion): **Action Surge** (L2), **Improved Critical** (L3, crits on 19-20), **ability score increases** (L4, L6, L8: +2 to STR, DEX or CON, picked on the level-up screen; saves already at L4+ get one to pick), **Extra Attack** (L5).

**Extra Attack breaks the Potion of Dexterity**, which is "attack twice." Rework it into "+1 attack each turn" (three attacks after level 5): in `combat.js` the `quick` flag becomes an attack count.

**Damage types:** skeletons are vulnerable to bludgeoning (the mace finally matters); wights resist weapons that aren't silvered (Brannoc silvers them). **Monster abilities:** multiattack (ogre, wight), ghoul paralysis (CON save or lose your turn), wight life drain.

### Warden runes

- **Rune slots** come back at a long rest, like spell slots, so towns matter to the hero too.
- **First rune (Act 2), Rune Strike:** after you hit, spend a slot for extra damage (2d8, more against undead). One button.
- **More runes come from the story, not shops:** carvings in the keep, the mentor, boss rewards. Ideas: *Iron Ward* (a reaction: +5 AC once), *Warden's Call* (heals and steadies the party), *Rune of Binding* (a monster loses its turn), *Breaking Rune* (an attack that hits every monster).

### The Oath (end of Act 3; decided: three to choose from)

At the door you pick one of three Oaths. It's permanent (no respec), and it changes how the rest of the game plays: your powers, your look and title, some of the people around you, and which monsters feel easy or hard. Each Oath has monsters that **fall to it**, so it feels powerful, and monsters that **test it**, so you can't just press the same button every fight. Act 4 mixes all of them, so every Oath gets easy fights and hard ones, and any of them can beat the dragon.

| | **Oath of Iron** | **Oath of Storm** | **Oath of Dawn** |
|---|---|---|---|
| Style | The unbreakable defender | The spellblade | The holy warrior (like the SRD paladin) |
| Colours and title | Grey steel and a tower on the cape; *Sworn of Iron* | Blue, with sparks along the blade; *Sworn of Storm* | Gold and white, a faint glow; *Sworn of Dawn* |
| Signature rune | **Unbroken:** once per long rest, drop to 1 HP instead of 0 | **Chain Lightning:** hits both monsters (a DEX save halves it) | **Dawnstrike:** a smite after you hit; double damage against undead and fiends |
| Always on | Heavy armour mastery (weapon hits on you do 3 less damage); one free Iron Ward per fight | +2 rune slots; **Blink** (once per fight, the next attack on you misses) | A healing aura (you and your companion heal a little at the start of your turn); immune to fear and disease |
| Companion bonus | **Shield Ally:** your companion takes half damage while you're standing | Half your rune slots come back on a short rest | Your companion's healing spells heal more |
| **Falls to it** | Big hitters that rely on weapons: giants, ogres, golems' fists, hell hounds' bites, the dragon's claws | Pairs and flyers: kobold packs, wyverns, griffons, imps; anything with weak saves | Undead and fiends: wraiths, vampire spawn, hell hounds, the dragon's undead servants |
| **Tests it** | Magic and saves that get round armour: casters, breath weapons, curses | Things that shrug off magic: golems (lightning does nothing), high-HP brutes that soak up big spells | Beasts and constructs that radiant damage doesn't hurt extra; long fights that use up your smites |
| How the world changes | Brannoc forges **Warden plate** (AC 20); the keep raises a **garrison**: guards on the walls, and the training yard becomes a sparring ring | Rachel's **rune library** grows a tower; Act 4's rune doors open with no check; Quill takes to you | Robyn's shrine in Fenwatch becomes a **temple**; the restless dead across the map go quiet; the ghosts in the keep start talking to you |
| An Act 4 path only it opens | Hold up a collapsing bridge while the party crosses (a strength trial) | Blink across a chasm to a hidden vault | Walk through a cursed gate that burns anyone else |
| Who's proudest | Brannoc (*"Now that's a Warden."*) | Rachel | Robyn |

**The hard fights stay fair:** every Act 4 zone mixes monster types, the bounty board keeps offering hunts that suit your Oath, and the companion you bring covers your gap: Rachel's COUNTER for Iron against casters, a hard hitter for Storm against golems, Claire for Dawn against beasts. That keeps the roster useful right to the end.

**Act 3 sets it up:** Maren has three Oath fragments (one per Oath), Colleen talks about one at each waystone, and the companions' campfire talks each lean toward one (Brannoc to Iron, Rachel to Storm, Robyn to Dawn). On the Oath screen the companion with you gives a one-line opinion, but you choose.

### The world notices

- **Titles:** NPCs call you by the title you've earned (Traveller, Hero of Oakhollow, Ironvale's Heir, Warden-in-training, Warden of Ironvale). Pip's lines grow with you.
- **Looks:** the hero's sprite changes with progress (a cape in Act 2, glowing runes on the sword, Oath colours), drawn in code in `hero.js`.
- **Choices come back:** Mother Sallow's bargain and the goblin refugees return in Act 3 (planned under Act 3: Choices come back).
- **Ironvale Keep becomes your home** after Act 2: rescued NPCs and spare companions move in (the roster lives here), and rooms unlock over the acts (Brannoc's forge, a rune library, a training yard for the minigames). By the end, the traveller who walked into Oakhollow with nothing rules the keep.

## Code that has to change

`maps.js` takes a new map in one line, but other places assume the overworld is the only outdoor map:

- **`src/world/travel.js`:** `TRAVEL_POINTS` gets `{ map, kind: "hub" | "camp", act }`; `canFastTravel(state)` becomes "you're standing in a safe zone or a camp".
- **Zones get `safe: true`** (no encounters, fast travel allowed) and a **`music`** field; `World.js` only picks between `village` and `wild` today.
- **`src/scenes/WorldMap.js`:** draws only the overworld; needs a page per region and silhouettes for locked ones.
- **Map objects:** only `goneWhen` exists. The Signet and Brannoc need the opposite, `shownWhen`.
- **`state.lastHub`** for fainting and the Homeward Feather; `faint()` in `src/state/game.js` always uses the Oakhollow spawn today.
- **`src/rules/party.js`:** `hero.roster`, tactics, and companions that cast.
- **`src/rules/combat.js`:** attack counts, conditions, saving throws, multi-target spells, damage types, rune and spell slots.
- **Saves:** bump the save format and migrate (pending ability score increases, the roster, slots, `lastHub`).
- **Act 1 changes** so the new rules apply everywhere: Oakhollow gets an inn and stops healing for free, Goblin Rocks gets a campfire camp, Tom's hut is a camp with a free bed, and the README is updated.

## Build order

One pull request each, with a minor version bump.

1. ~~**Safe places:** hubs and camps, paid inn rest, short and long rests, `lastHub`, the Homeward Feather, the Act 1 changes.~~ **Built in 0.18.0.** Oakhollow's inn is the Sleeping Fox (Nell, 10 gold a night). A short rest brings you up to half your HP and back, so resting twice does nothing more and a free campfire is never as good as a bed. Zones don't have `safe` or `music` fields yet: safe places are `TRAVEL_POINTS` in `travel.js` (a hub's zone and rooms, or within 3 tiles of a camp's centre), which is enough until step 7 adds more maps.
2. ~~**Fighter features** (L2-8), the Potion of Dexterity rework, saving throws.~~ **Built in 0.19.0.** Action Surge is a SURGE button: one more action, then your turn ends. Ability score increases are picked on a LevelUp screen that opens over the world whenever `hero.asi` > 0 (it can't be skipped). Saving throws are `savingThrow()` in `checks.js` (a fighter adds proficiency to STR and CON saves); nothing calls for one yet. Monsters have no ability scores, so their saves wait for the magic engine (step 3).
3. ~~**Magic engine:** slots, cantrips, multi-target spells, conditions, scrolls. Rules only and unit-tested, built for both companions and hero runes.~~ **Built in 0.20.0.** `data/spells.js` (14 SRD spells: Fire Bolt, Sacred Flame, Produce Flame, Vicious Mockery, Magic Missile, Burning Hands, Sleep, Shield, Cure Wounds, Healing Word, Bless, Entangle, Faerie Fire, Fireball, plus the SRD slot table), `rules/conditions.js` (asleep, paralyzed, restrained, outlined, mocked, blessed, shielded) and `rules/magic.js` (`makeCaster`, a caster's `book` of known spells and used slots, `spendForSpell`, `castSpell`, `readScroll`, `healOutsideBattle`). The battle engine now runs conditions every turn, and monsters have SRD saves and a creature type. Not done yet: concentration (Bless and the rest just last their rounds), Turn Undead, Spiritual Weapon, Moonbeam, Misty Step, Goodberry and Hypnotic Pattern; scroll items exist but aren't sold or found, and no screen casts anything: step 4 adds the casting companions and the buttons.
4. ~~**Companion roster** and tactics (option C); Megan moves onto it.~~ **Built in 0.21.0**, with spell scrolls in the apothecary too. The roster is `hero.roster`, swapped through Nell at the inn (any inn, once there are more). Tactics live in `rules/tactics.js`: ATTACK, HEAL (potions from your pack for Megan; healing spells first for a caster) and SAVE MAGIC (casters only: cantrips). Tapping a companion in battle sets `companion.lead`, and their turn waits for SHOOT, a potion, SPELLS (casters) or AUTO. The auto-play doesn't use Sleep, Entangle, Faerie Fire, Bless or Shield yet: only damage and healing; a caster you lead can cast them. Companion casters are tested with a stand-in wizard, since the first real one arrives in step 8.
5. ~~**Act 1 plant:** the crest on the sword, and support for titles.~~ **Built in 0.22.0**, with hero naming (open question 3: yes). The crest is `crest: true` on the starting longsword: "a tower between two keys", only in its description; it can't be sold, so Brannoc can always see it in Act 2. Titles are `TITLES` in `story/hero.js` (Traveller, Hero of Oakhollow so far); add each act's as it's built. Lines that use the name go through `callName()`, so they still read well for a hero who kept the default "Hero".
6. ~~**The King's hall:** the Signet, Brannoc, the King's last words, `shownWhen`, Q3.~~ **Built in 0.23.0.** The last words play after the fight (`afterWin` on the battle). The Signet (a key item: kept, never sold) and Brannoc (STR or DEX DC 12 to free him) appear with `shownWhen: "kingDefeated"`; Brannoc then waits by Oakhollow's smithy. Q3 runs: take the ring, free Brannoc, show Maren (who names Ironvale Keep and its Wardens, and spots the same crest on your sword), ask Brannoc (the Iron Road, and the goblins' back passage, now choked with rubble). Its last step, "Find the way to Ironvale", waits for step 7. Bloodline hints so far: the ring's crest matches the sword's and is warm in your hand; Brannoc half-recognises the crest; Maren: "Old blood turns up in strange places."
7. ~~**Multi-map travel** and the world map by region.~~ **Built in 0.24.0**, with the passage still blocked (agreed: it opens with the fen, step 9). `REGIONS` in `travel.js` (vale, ironvale, pass, beyond): a region with a `map` is open; the others are dark shapes (`shape`: keep, mountains, door) with a `hint`. Every map has a `region`; zones have `music` and `safe`; travel points carry their `map`, so fast travel, the Homeward Feather and fainting work across maps. The rubble object in the King's hall (`id: "rubble"`) marks the passage: when the fen is built, give it `goneWhen` and add an exit there. To open Ironvale, give its region a `map` and its travel points (Fenwatch, the Keep Gate).
8. ~~**Greywater Fen:** tileset, map, `fen` track, new monsters, Mother Sallow and her choice.~~ **Built in 0.25.0** (swapped with Fenwatch, so the town has somewhere to be). `src/world/ironvale.js` is the whole region: the fen (south), Fenwatch's palisade (south-east, gate shut), the drowned causeway, the keep's walls (portcullis down) and the Mountain Pass (rockslide). Brannoc clears the goblins' passage the next time you talk to him after asking; quest 3 ends when you tell Maren about the fen (1,500 XP, 150 gold). Quest 4: Mother Sallow (SRD green hag, 9d8+27 HP rather than 82) takes the Goblin King's crown (now in his hall) or a fight; either raises the causeway (3,000 XP, 200 gold) and `sallowBargain` remembers the deal for Act 3. Monsters can now have several attacks (lizardfolk) and on-hit effects with saves (ghoul paralysis). New tiles: marsh, reeds, shallow water (slow), mud, boardwalk, dead tree, causeway, keep wall, palisade, passage. A battle simulator still isn't in `tools/`: the numbers below came from a throwaway script. Simulated win rates (with +1 gear and potions): level 5 alone vs Sallow 77%, with Megan 97%; level 4 vs two lizardfolk 67%, vs two ghouls 83%.
9. ~~**Fenwatch:** the tavern, bounty board, Brannoc's forge, and Robyn the cleric (the first of Claire, Rachel and Robyn).~~ **Built in 0.26.0.** Fenwatch is a hub (`innCost` 25) inside the palisade on `ironvale.js`; the inn script is shared (`innScript` in scripts.js), with companions under a "Your companions" sub-menu. The bounty board (`story/bounties.js`) counts kills from the bestiary, one hunt at a time, repeatable. Brannoc's forge is a shop with `maxUpgrade: 5`; silvering waits for damage types (step 10). The herbalist is Wren (only a name so far; she's still a companion candidate). Robyn: The Restless Dead (beat two ghouls at the cairn, `gravesAtRest`), then she joins; joining sends the current companion to the roster. Companion battle lines now use names, not pronouns. The conversation screen fits up to five answers (slimmer buttons past three: keep those labels to one line). Not built: the tavern's dice table and the goblin refugee camp (minigames and Act 3's payoff), and the ferryman.
10. **Ironvale Keep**, in two parts:
    - ~~**10a:** the dungeon, damage types and silvering.~~ **Built in 0.27.0.** `src/world/keep.js` (courtyard, chapel, armoury, tomb), entered through the portcullis (STR 15 or DEX 13); the tomb door opens when the courtyard lever, chapel seal and armoury lever are all done (`script: "lock"`, STR or DEX 14). Monsters: skeleton (vulnerable to bludgeoning), ghast (paralysis), wight (`weaponResist: "silver"`), helmed horror (AC 20). Weapons have a `damageType`; `adjustDamage` applies `vulnerable`, `resistant` and silver. Silvering is a forge tab (100 gold) and Brannoc's Tools side quest. The battle simulator is `tools/simulate.mjs` (`npm run sim`). Keep fights come in pairs: with +2 armour and shield the hero's AC is about 22, and single SRD undead barely land a hit. The battle screen has room for two monsters, no more.
    - ~~**10b:** Lord Varric, the bloodline said aloud, the first rune, the reforged blade, the ending.~~ **Built in 0.28.0.** Varric (`lordVarric`: AC 18, 13d8+39, two longsword swings and Grave Touch with paralysis, `weaponResist: "silver"`, resists necrotic) appears in the tomb with `shownWhen: "tombOpen"`, says "Warden's blood... at last" as he falls (`afterWin: "varricFalls"`), and the Signet goes back on his tomb (`signetReturned`, quest 5's reward: 500 gold, 5,000 XP). Brannoc then reforges the crested sword into the Wardenblade (`reforgeBlade`: base `wardenblade`, silvered, upgrades kept) and teaches Rune Strike (`RUNES` in `character.js`: 2 slots, 3 from level 9, back with a long rest; a SKILLS page in battle). Title: Ironvale's Heir. Simulator: 34% at L6 +3, 83% silvered, 96% silvered with Robyn.
11. ~~**The keep as your hub** (start of Act 3).~~ **Built in 0.29.0.** A travel point with `wholeMap: true` (safe anywhere on the keep's map, the tomb too) and `opensWhen: signetReturned`, `innCost` 0 and its own `music`. Hild the steward (`keepHall`, the shared `innScript`) appears with the Signet back; talking to her sets `keepHome`. Brannoc moves from Fenwatch to the keep's courtyard once he's reforged the blade (`keepForge`, which opens the forge shop through a new `shop` conversation event). The world map marks a place on a map of its own (the keep) at the way in. Not built yet: the keep's rooms unlocking over the acts (a rune library), the training yard (step 12's minigames), rescued NPCs moving in.
12. ~~**Minigames**~~ **built in 0.30.0** (see Minigames above). **Later:** the other companions, one at a time.

### Act 3 (proposed)

13. ~~**Act 3 groundwork:** an `act` helper from the flags (scripts branch on it for the "going back" lines), weak monsters running away, fighter levels 9-12 (Indomitable, the second Fighting Style, Extra Attack (2)), and campfire talks with remarks (a talk count saved on each companion, so the save format goes up). Megan's and Robyn's first talks come with it.~~ **Built in 0.31.0.** `actOf(flags)` in `story/hero.js` (3 once `bladeReforged` and `keepHome`). Each encounter area has a `level`; `runsAway()` in `encounters.js` (five levels over, half the time, a quarter of the XP). Indomitable is `resistSave()` in `combat.js` (monster effects' saves); the level-10 style is `hero.fightingStyle`, picked on the LevelUp screen. Talks and remarks are `story/talks.js`: all three talks for Megan, Robyn and Rachel are written, gated on `rockslideOpen` and `wardenTraining` (and Rachel's third on `bindingRecovered`); Megan's third sets `matthewQuest`, Robyn's `chapelQuest`. Save format 6.
14. ~~**Rachel and the rockslide (Q6):** `art/rachel.js` and Quill's sprite, `pass.js` with only its lower slopes and Rachel's camp, the rune-stone hunt, the rockslide opening, and Rachel's mechanics (copying scrolls, Arcane Recovery, FLYBY, SEND QUILL, reading runes). The rune carvings in the Act 1 and 2 maps come here too.~~ **Built in 0.32.0**, with the whole of `pass.js` (48 x 80: slopes, snowfield with the ice puzzle, the chasm and rope bridge, heights, the watchtower, Thorne's camp, the Frozen Chapel's walls and the gatehouse door), the snow tiles and ice sliding (`slide()` in `map.js`; `World.js` slides smoothly), and the `pass` track. Act 3's scripts are `story/act3.js`. Rachel's camp and the rune-stones are on `ironvale.js`; the rockslide is a camp. Rachel carries a light crossbow (companion gear is a bow slot). Her book is `companion.spells`; Misty Step and Lightning Bolt are new spells (and scrolls). The moon half of the charm is mentioned when she joins. Quest 6 pays 400 gold and 4,000 XP. The pass has no monsters yet (step 16).
15. ~~**Going back, part 1:** Pip's Big Adventure and the kobolds in the Warrens, the statue, the plaque and the bard, Hazel, Maren's Oath fragments, Old Gnasher.~~ **Built in 0.33.0.** Pip runs away the first time you walk into Oakhollow after the rockslide opens (`zoneEvent()` in `act3.js`, `pipRanAway`). His trail is a shield in the wood and a chalk mark by the goblin cave. The kobolds (SRD, 25 XP) are a two-kobold fight in the rat nest. Hazel's letter is from Old Tom, and it starts Old Gnasher (a `gnasher` fishing spot at Willowmere while `gnasherQuest` is on; Gnasher pulls hardest of all). The badge is a trinket checked in `resistSave()`, spent only when +1 turns a failure into a success. Maren's fragments set `oathFragments` for the Oath screen.
16. ~~**The Warden's Road (Q7):** the rest of `pass.js`, snow and ice, the `pass` track, the slope and snowfield monsters, Warden Colleen, the three waystones, Iron Ward (with the reaction prompt), Warden's Call, Thorne's camp and the Rune of Binding. Title: Warden-in-training.~~ **Built in 0.34.0** (the map, snow, ice and track came in 0.32.0). Iron Ward pauses a monster's turn (`battle.pending`, `reactAction()`), and the simulator always wards. Warden's Call and Binding are SKILLS actions (`runeDc` = 8 + proficiency + STR). Trials are battle options: `surviveRounds` (the monsters crumble at the turn of the round) and `guardAlly` (if your companion falls, the trial's `afterFail` plays instead). New monster rules: `regen` (trolls; fire stops it), `poison` (extra damage, halved by a save), `weaponResist: "magic"`. Act 3 monsters hit at +9 to +11 (heroes have AC 24-30 by now) with about a third more HP than the SRD; simulated, a level 9 hero with +3 gear and Rachel wins every slope fight with 85-100% of their HP left, the snowfield's with 65-90%, and the heights are for level 11. The wolves on the heights are a zone event (`sawWolves`); the sun charm and Thorne's mirror are key items (the mirror is for Sallow, step 18).
17. ~~**Companion quests:** Corwin's Arrows (Volley, the watchtower, Corwin at the keep) and the Frozen Chapel (Turn Undead, Spiritual Weapon, wraiths).~~ **Built in 0.35.0.** Volley is `companion.volley` (`canVolley`/`volley` in `tactics.js`). Corwin's rematch is the archery screen with `{ rival: "matthew" }` (40 to beat, `archeryMatthew` prize: a Griffon Longbow +2 for Megan). He says the Claire line at the keep if Rachel is with you (`matthewClaire`), since only one companion travels at a time. Turn Undead is a level 2 cleric "spell" (Channel Divinity) with `onlyType: "undead"` and the `turned` condition; Spiritual Weapon is a 2d8 force spell attack (no lingering weapon). Wraiths have two attacks (Life Drain can frighten) and resist plain steel; simulated, the chapel's fights run from easy (two specters) to dangerous (two wraiths: 73% at level 9, 94% at level 10).
18. ~~**Choices come back:** the goblin refugee camp at Fenwatch first (the Act 2 gap), then the mine shortcut and Snik, the Queen of the Fen or Auntie Nettle, the ferryman, and Sallow's Sundries.~~ **Built in 0.36.0.** The refugee camp is west of Fenwatch's palisade (`refugeesHelped`, or `refugeesRefused`, after which there's no shortcut). Map objects can now need several flags (`shownWhen: [...]`, all of them) or go when any of several are set (`goneWhenAny`). Monsters can cast (`spells` on a monster: a save for damage and a condition, with uses per fight); the hero's missing ability scores (WIS) count as 10. Named monsters (`proper`) aren't "the" in the log. Shops can have a `markup` (Sundries 1.5, Grub 0.8). The ferryman's island is three tiles in the south lake. Bounties carry an `act`. Simulated, the crowned Sallow and Auntie Nettle are won at level 9 with 73-84% of your HP left.
19. ~~**The Wardens' Gatehouse (Q8):** `gatehouse.js`, rune doors, the frozen forge and rune-iron (the blade's second form), COUNTER, Thorne and his shield guardian, and the choice to spare him. Tune with `npm run sim`.~~ **Built in 0.37.0.** The door opens for all three runes (`gatehouseOpen`); rune doors are `runeLock` objects with an `answer`. The blade's second form is `hero.bladeForm = 2` (+1 rune slot). COUNTER is a second kind of `battle.pending` (`kind: "counter"`), offered when Rachel knows Counterspell (a `reaction` spell: copy it from the scroll) and has a slot of level 3+; a higher spell needs her INT check against 10 + its level, and a monster's `breath` can't be countered. Thorne (`thorne`: AC 16, 20d8+60, two staff blows, three spells) is `guardedBy` his shield guardian (+3 AC while it stands) and `hesitates` with Rachel there. Simulated at level 11 with +4 gear: 98% with Rachel and Counterspell, 94% with Rachel, 81% with Robyn, 72% with Megan. Sparing him sets `thorneSpared` (the cells come with step 20); leaving him, `thorneLeft`. Quest 8 pays 12,000 XP and 1,000 gold.
20. **Built in 0.38.0 (`rules/oaths.js`, `scenes/Oath.js`, `afterOath` in `act3.js`).** **The Oath and the end of Act 3:** the cracked door and the eye, the Oath screen and titles, Oath colours on the hero, and the keep's new rooms (the library, the training yard rematches, the cells).

Claire's hints go in with the step they belong to: the moon charm with Rachel (14), the sun half and the wolves with the pass (16), Corwin's line (17), Thorne's line (19), "Rae?" with the ending (20). Each Oath's world changes (the garrison, the library tower, the temple) also come in step 20.

### Act 4 (proposed)

21. ~~**Act 4 groundwork:** fighter levels 13-16 (Indomitable twice, Superior Critical, the L14 and L16 ability score increases), `actOf()` returning 4 once Q9 starts, and the **second companion** in battle: a second ally slot in the rules (turn order, monsters picking between three targets, tactics for both, `guest` companions who aren't on the roster) and room on the Battle screen for two allies. Save format 7. Test it with a cheat-screen fight before any story uses it.~~ **Built in 0.40.0.** `actOf()` is 4 from `act3Complete` (Q9 begins as Act 3 ends). `hero.indomitableUsed` now counts uses (save format 7; an old `true` is one use). A second companion is `createBattle(..., { second })` with a companion record from `secondCompanion(hero, id)` (their roster record if they're waiting there, so wounds and slots carry on, else `guestCompanion(id)`); the Battle scene takes `second: id`. In a fight they're `battle.ally2` (key `"ally2"`, `leadAlly2`); every companion in a fight keeps its record as `src`, and the tactics helpers take the companion's key. Monsters pick evenly between everyone standing, so fights with one companion play exactly as before (the simulator's table didn't move). The party of three stands at `PARTY_OF_THREE` in `stage.js`. The items page's companion potion goes to whichever companion is worse off. The cheat code STRENGTH IN NUMBERS starts a test fight with a second companion. Simulated at level 13 with +4 gear and one potion, two stone giants: 91% with Megan, 99% with Megan and Rachel.
22. ~~**Through the Door (Q9):** `beyond.js` with only its southern part (the Threshold, the ash road, the gorge, the wildwood's edge), the ash and lava tiles, the `emberreach` track, opening the door (and fast travel on both sides), the kobold warband, the wolves, the ash road's monsters, and Pip stowing away. The `beyond` region gets its map.~~ **Built in 0.41.0.** Act 4's scripts are `story/act4.js` (`act4Event()` runs after act3.js's `zoneEvent`); the Door's opening nodes are in act3.js's `greatDoor` (`doorOpened`). `beyond.js` is 64 x 40 for now: the south only, with the gorge (lava, rows 12-14) right across and the burned land past it unreachable; a wall of burned trees at x 24 leaves the road the only way west, through the warband. Adding the north means adding rows at the top, so every y on the map moves down by that many. Map objects can be `walkable` (only a picture: the open Door on both sides, which is the exit tile). New tiles: ash, cinders, obsidian, lava, burnttree, wildtree. Monsters can be `immune` to a damage type. Camps: `doorCamp` (in the gatehouse's Door chamber) and `threshold`. The wolf's trail (`wolfWaiting`, after `q9Done`) is where step 23 picks up. Q9 pays 10,000 XP and 500 gold. Simulated at level 13 with +4 gear and any one companion, the ash road's fights are won 99-100% of the time with 77-87% of your HP left; a lone salamander or fire elemental was too easy (97% left), so they always come with company.
23. ~~**Claire and Two Halves (Q10):** `art/claire.js` with bear and cat forms, Wild Shape (a second HP bar), the druid spells (Moonbeam, Call Lightning, Conjure Animals as the wolf pack), hearing the land (beasts walk away, hidden paths), breaking curses, the wildwood and her grove, the charm made whole, and the first two-companion fight with Rachel as a guest if needed. Her three talks.~~ **Built in 0.42.0.** Claire is `claire` in `COMPANIONS` (`art/claire.js` on Megan's frames; the forms are `bearForm` and `catForm` in `art/monsters.js`). Changes from the plan: she carries a **sling and leather** rather than a quarterstaff and hide, since companions use a bow slot and light armour. Breaking curses is **CALM** in a fight (it ends frightened, paralyzed and restrained on any of you, and she does it first by herself), not something after the fight. The hidden path is the thicket by her grove, which goes once she's joined, to a glade with a cache. The wildwood has no monsters yet (the giant apes and werewolves wait for its north side). The whole charm (`twinCharm`) is a key item for now: its tag-in comes with step 27's tag-in between phases. Wild Shape is `form` on the battle's companion (`hurt()` sends damage to it first and returns "a bear" when it ends); `shapesUsed` on her record, two per rest, back on a short rest too. Companions now have `saves` (DEX for all; Claire's WIS and INT proficient) and `resistsMagic` (advantage against monster spells). Spells can `linger` (a lingering condition hurts at the start of the monster's turn) and there's a `pack` kind (`battle.pack`). A fight's own party is `createBattle(..., { allies })` (Battle scene `party: [ids]`, from `partyRecords`). With Claire in your party, an all-beast encounter doesn't happen (`beastsLeave`). Simulated at level 13 with +4 gear: the brood fight (young red dragon and fire elemental) is won every time with both twins, with about 60% of your HP left (71% with Rachel alone). On the ash road, Claire leaves you with 86% of your HP, against 78-79% with Megan or Rachel.
24. ~~**Lastwatch and Matt (Q11):** the rest of `beyond.js` east (Lastwatch, the shrine of the Dawn, the kobold diggings, the aeries), the Cinder Wardens and the rest of the region's monsters, `art/matt.js`, Matt's story and a scene for each sister (at Lastwatch, or at the keep for anyone who wasn't there), Lastwatch as a camp with his sparring rematch, the Breaking Rune, the true name, and Thorne's Act 4 lines in the cells (the binding, and Claire's talk with him).~~ **Built in 0.43.0.** The map is 104 wide now (the east was added beside the old map, so no coordinates moved): the ash road runs east along row 16 to Lastwatch (zone `lastwatch` outside, `lastwatchHold` inside, safe), the shrine of the Dawn south-east of it (shut: Robyn's part is step 25), and the Wardens' bridge north over the gorge to the `aeries` zone (a nest cache, and the diggings' mouth: Megan's part is step 25). The Cinder Wardens are a two-monster gate fight (`CINDER_FIGHT`); Matt is one script, `matt`, for the meeting and every visit after (a daughter in your party gets her scene the first time: flags `rachelMetMatt` and so on), and `familyNews` tells the rest at the keep (`rachelHeard` and so on). The Breaking Rune is `breakingRune` (5d8 force, every monster, a DEX save halves it); it and the Oath's rune share a second SKILLS page. The true name is the flag `trueName` and Thorne's binding `thorneBinding`, both for step 27. Changes from the plan: Matt's "sparring rematch" is an arm-wrestle (his leg won't let him spar), for his Captain's Badge (+2 DEX). Monsters: Cinder Wardens (custom wights: two burning swords, a Cinder Burst, immune to fire), vampire spawn (they regenerate unless radiant hits them, and radiant does double), mummies, rocs, giant apes and werewolves (the treant waits). Alone, Lastwatch's monsters left you 96-99% of your HP, so they always come in twos. Simulated at level 14 with +4 gear and the Breaking Rune: every fight won, with 70-89% of your HP left round Lastwatch, 87% against a roc and 67% against a young red dragon; the gate fight leaves you 63-71% (level 13 or 14, any companion).
25. ~~**The sisters' pledges:** The Mapmaker (Dunstan, her da's letter, Arrows of Dragon Slaying), The First Light (Mass Healing Word), Claire's pledge, the pledge banners in the keep's hall, the Oath paths and vaults, and the last round of choices coming back (Sallow's fire potions, Snik's tunnels, new hub lines and bounties).~~ **Built in 0.44.0.** The Mapmaker is `diggings` (Megan in your party) then a fight with the Great One's overseers (`DIGGINGS_FIGHT`: a salamander and a hell hound) and `dunstanFreed` (Corwin's Letter and Dunstan's Map as key items; `dragonArrows` on Megan's record, used up one a hit on a dragon: DC 17 CON or 6d10 more, half on a save). The First Light is `dawnDoor` (Robyn in your party) then a four-round `surviveRounds` trial against a vampire spawn and a wraith, and `firstLight` (Mass Healing Word: a `heal` spell whose `targets` is "party"; by herself on HEAL, Robyn says it when two of you are at half HP or less). Claire pledges at Lastwatch (`clairePledge`, an `act4Event`) once every sister who's joined you has (`sistersPledged`; Rachel's pledge is the charm, `q10Done`). Each pledge pays 300 gold and 5,000 XP; the banners are `pledgeBanner` objects in the keep's courtyard (`bannerRachel` and so on, one drawing in each sister's colours). The Oath paths: Iron at `gorgeEdge` (three STR checks at DC 16, proficient; a slip costs 10 HP), Storm at the `stormStone` by a lava lake in the aeries (the vault's on an islet you can't walk to), Dawn through the `cursedGate` in Lastwatch's old tower (it burns anyone else for 8 HP); each vault pays 3,000 XP (`ironVault`, `stormVault`, `dawnVault`). Changes from the plan: the Dawn banner's "healing light on a guest or second companion" already happens (the light reaches everyone in the party), so the banner doubles the light instead. Fire resistance (the tower shield, or Sallow's potion: `effects.fireResist`, used up by the next fight like Dexterity) halves fire from breath, spells and the fire monsters' attacks (their attacks now have `damageType: "fire"`). Snik's tunnels are a flag, `snikTunnels`, from his old mine on the pass; the way in comes with the Emberdeep (step 26). Sallow's Act 4 stock is `sundriesDragon`, and the board shows the pass's hunts and the Emberreach's in Act 4. Simulated at level 14 with +4 gear: the diggings fight leaves you 75% of your HP, and the shrine's trial 91%.
26. ~~**The Emberdeep (Q12):** `emberdeep.js`, the `emberdeep` track, golems and giants, the two back ways (Dunstan's map, Snik), Brannoc's lost forge and the Wardenblade's final form, the hoard's doors.~~ **Built in 0.45.0.** `src/world/emberdeep.js` (40 x 44): in from the aeries at the bottom (the gate is at the top of `beyond.js`, zone `emberGate`), the `tunnels` (fire giants, clay golems with a hell hound, the brood), the `golemHall` (a clay and a stone golem in its north door, `GOLEM_FIGHT`), the upper cave, the `lostForge` (a camp once Brannoc's there) and the `hoardDoors`. The back ways: Dunstan's red tunnel is the `redCrack` (open with his map: `redTunnel`), and Snik's is a new choice at his old mine on the pass that drops you in the upper cave (`snikWay`); an exit there leads back to his mine. Brannoc moves in when you tell him at the keep (`brannocAtForge`: his keep forge goes with him for now) and finishes the blade (`bladeForm` 3, `bladeFinalForm`, `brannocPledged`) by the twins' charm, or with Rachel or Claire in your party to read the forge's runes. The final form adds a rune slot and makes `fireproof` true while you wield it. The hoard's last guards are a fire giant and its hell hound (`HOARD_GUARDS`); the doors want the final form, and opening them is `q12Done` (15,000 XP, 1,000 gold). The `emberdeep` track is the gatehouse's organ, slower and with a flattened second. Changes from the plan: the hoard's guards were going to be a giant and a young dragon, but that pair won only a quarter of the time with one companion, so it's the giant and its hound; fire giants hit for 3d6+7 rather than the SRD's 6d6+7 (Act 4's +12 to hit makes them dangerous enough). Simulated at level 15 with +4 gear: the golem hall wins 88% with Megan (95% Robyn, 99% Claire), the hoard's guards 96-99%, and the tunnels' fights all win with 58-90% of your HP left.
27. **Vorthax and the ending:** monster rules for flying (melee disadvantage), breath recharge, lair actions and legendary resistance; battles that chain into the next phase with HP carried over and tag-in between them; Claire's rally; the true name and Thorne's binding; the `dragon` track; Matt at the hoard's door; Colleen's last appearance; the ending in the keep's hall (Matt moves in), *Warden of Ironvale*, the credits and free play. Tune with `npm run sim` against the targets in The last fight.

## Open questions

1. **The hero's secret:** leaning to the last Warden heir: Act 2's opening (0.23.0) hints at the bloodline without saying it. Still open: confirm it, and when it's said out loud (built in 0.28.0 as Varric's "Warden's blood... at last").
2. ~~**Oaths:**~~ Decided: three to choose from, each changing the rest of the game (see The Oath).
3. ~~**A name for the hero:**~~ Decided and built in 0.22.0: picked at NEW GAME (or RENAME in the bag), "Hero" if left empty.
4. **Claire, Rachel and Robyn:** Robyn is decided (a cleric, met at Fenwatch). Rachel is proposed for Act 3: the wizard, Thorne's old apprentice (see Act 3). Claire is decided: Rachel's twin and opposite, a druid, joining in Act 4 and bringing the whole party together for the dragon.
5. **Inn prices:** about 10 gold in Act 1 and 25 in Act 2 is a guess; tune once the economy is clearer.
6. ~~**Act 3's cast:**~~ Decided: Megan's father is **Corwin** (first called Matthew; renamed in 0.39.1 so he doesn't clash with Matt), the rival is **Aldric Thorne**, and the mentor is the ghost of **Warden Colleen**, the last Warden and the hero's ancestor.
7. ~~**Sparing Thorne:**~~ Decided: a real choice, and it matters in Act 4.
8. ~~**Ice tiles:**~~ Decided: in, as short sliding puzzles on the pass.
9. **Act 4's names:** the dragon (Vorthax), the land beyond (the Emberreach), its dungeon (the Emberdeep), Lastwatch and Megan's da's partner (Dunstan) are placeholders.
10. ~~**The family:**~~ Decided: Claire, Rachel, Megan and Robyn are sisters, the daughters of Colleen and **Matt**, the Wardens' captain. Matt is alive beyond the door, because Colleen's seal froze the valley in time until it began to fail twenty-five years ago (see Act 4: The story in one breath). The hero descends from their brother, the son Colleen sent south.
11. ~~**Megan's da needs a new name:**~~ Decided and built in 0.39.1: **Corwin** (he was Matthew, which clashed with Matt). Only what players see changed; the internal ids (`matthewQuest`, `matthewFound`, `archeryMatthew` and the rest) kept their names so saves carry over.
12. **Thorne after the ending:** can the hero free him to help rebuild the Emberreach?
13. **Past level 16:** does free play keep levelling (the XP table goes to 20), or does the game stop at 16?
