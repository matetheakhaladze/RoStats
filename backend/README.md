# RoStats API

FastAPI backend deployed to Vercel as one serverless function (`api/index.py`).

Environment variables (set in Vercel, never committed):

- `ANTHROPIC_API_KEY`  Claude key for the chatbot
- `GOOGLE_API_KEY`     Gemini key for the Art Generator
- `CLAUDE_MODEL`       optional, defaults to the cheapest Claude model
- `GEMINI_IMAGE_MODEL` optional, defaults to gemini-2.5-flash-image

Run locally:

```bash
pip install -r requirements.txt uvicorn
uvicorn api.index:app --reload
```
