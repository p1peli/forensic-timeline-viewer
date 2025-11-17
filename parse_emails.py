import mailbox
import json
from dateutil import parser as dateparser
from email.utils import parseaddr, getaddresses


def get_email_body(msg):
    """Extract plain text body from email message."""
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition"))
            if content_type == "text/plain" and "attachment" not in content_disposition:
                try:
                    return part.get_payload(decode=True).decode(
                        part.get_content_charset() or "utf-8", errors="ignore"
                    )
                except Exception:
                    continue
        return ""
    else:
        try:
            return msg.get_payload(decode=True).decode(
                msg.get_content_charset() or "utf-8", errors="ignore"
            )
        except Exception:
            return ""


def parse_mbox_file(path):
    mbox = mailbox.mbox(path)
    events = []

    for i, msg in enumerate(mbox, start=1):

        subject = msg['subject'] or "(No subject)"

        sender_full = msg['from'] or ""
        _, sender_email = parseaddr(sender_full)
        sender_email = sender_email.lower() or "(unknown)"

        to_raw = msg.get('to', "")
        receiver_list = []

        if to_raw:
            parsed = getaddresses([to_raw])
            receiver_list = [email.lower() for (_, email) in parsed if email]

        date_raw = msg['date']
        try:
            dt = dateparser.parse(date_raw)
            timestamp = dt.isoformat()
        except Exception:
            timestamp = None

        body = get_email_body(msg)

        events.append({
            "id": i,
            "subject": subject,
            "sender": sender_email,
            "receivers": receiver_list,
            "timestamp": timestamp,
            "body": body
        })

    # Sort chronologically
    events.sort(key=lambda x: x["timestamp"] or "")
    return events


if __name__ == "__main__":
    folder_type = ""
    while folder_type.lower() not in ["inbox", "sent"]:
        folder_type = input("Parse Inbox or Sent folder? [inbox/sent]: ").strip()

    mbox_file = input(f"Enter path to Thunderbird {folder_type} mbox file: ").strip()
    events = parse_mbox_file(mbox_file)

    json_filename = f"events_{folder_type}.json"
    with open(json_filename, "w", encoding="utf-8") as f:
        json.dump(events, f, indent=2)

    print(f"\nParsed {len(events)} emails → {json_filename}")
