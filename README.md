# Forensic Timeline Viewer

A lightweight browser-based tool for visualizing email activity on a unified interactive timeline.  
No installation required — everything runs locally in your browser.

🔗 **Live Demo:**  
https://p1peli.github.io/forensic-timeline-viewer/

---

## JSON Format

Sent and inbox email JSON files must contain an array of objects.

### 📥 Inbox example
```json
{
  "sender": "alice@example.com",
  "subject": "Hello",
  "body": "Message text...",
  "timestamp": "2023-02-12T10:22:00"
}
```
### 📤 Sent example
```json
{
  "sender": "me@example.com",
  "receivers": ["bob@example.com", "carol@example.com"],
  "subject": "Re: Hello",
  "body": "Reply text...",
  "timestamp": "2023-02-12T11:45:00"
}
```
