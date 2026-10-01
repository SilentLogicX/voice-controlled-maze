# Voice-Controlled Maze

## Files
- index.html — main game
- scoreboard.html — separate scoreboard page
- style.css — styling
- script.js — maze, movement, speech recognition and localStorage scoreboard

## Run
1. Put all four files in the same folder.
2. Open `index.html` in Google Chrome or Microsoft Edge.
3. Enter a student name and click Start Maze.
4. Click Start Voice Control and allow microphone permission.
5. Say: up, down, left, or right.
6. Finish the maze to save the student's moves and score.
7. Open Scoreboard to see saved results.

## Important
Speech recognition is browser-dependent. Chrome/Edge provide the most practical support. For microphone access, serving the folder through localhost is recommended.

Example:
- VS Code: use the Live Server extension.
- Or run a local server with Python: `python -m http.server 8000`
  then open `http://localhost:8000/`.
