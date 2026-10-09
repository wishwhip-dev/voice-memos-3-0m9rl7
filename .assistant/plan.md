# Plan

Goal: Voice memos. Press a button to start recording from my microphone, see the elapsed time and a level meter while it records, stop, then play the memo back. Keep a list of memos with editable names that survives a reload.

1. A button labelled "Record" sits on the home page; pressing it requests microphone access and recording begins, the button changing to "Stop" with a visible recording indicator; if permission is denied or no microphone exists, a visible message on the page says so instead of throwing, and pressing Record again retries the request.
2. While recording, an elapsed-time readout counts up in m:ss format and a live level meter whose filled amount follows the microphone's current loudness updates continuously until the recording is stopped.
3. Pressing Stop ends the recording, releases the microphone, and the new memo appears at the top of the memo list with a sequentially numbered default name (Memo 1, Memo 2, ...), its duration in m:ss and the date it was recorded, with a toast confirming the save.
4. Recording for under a second still produces a saved memo, shown with a 0:00 duration rather than failing or disappearing.
5. Each memo row has a Play button that plays the recording back; the row shows a playing state while audio plays, pressing the button again or the audio ending stops playback, and starting playback on a second memo stops the first so only one memo plays at a time.
6. Memo names are editable in place: activating a memo's name turns it into a labelled input inside a form, saving with Enter, the Save button or blur updates the name shown in the list, Escape cancels the edit, and a name saved as empty or whitespace-only keeps the previous name.
7. Each memo has a Delete button whose label says Delete; pressing it removes the memo and its audio from the list, and deleting the memo currently playing also stops its playback.
8. Memos (name, recorded date, duration and the audio blob) are written to the Dexie database on creation and on rename, and reloading the page still shows every memo with its edited name and playable audio.
9. If the page is reloaded or closed mid-recording, the in-progress audio is discarded: the list on return renders normally with no broken or partial memo entry.
10. With no memos recorded yet, the page shows an empty-state message inviting the first recording rather than a blank list.
11. Recording and playback are keyboard-operable: the Record/Stop and Play controls are focusable buttons that respond to Enter or Space, and the rename input is reachable by Tab.
12. The layout works on a phone-sized screen: the record button, timer, level meter and memo list stack in a single column with no horizontal scrolling or overlapping controls.

These are the outcomes this task is judged against.