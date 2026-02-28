"""データインポート・エクスポートタスク"""

import csv
import io
import json
import os
from datetime import datetime

from app.tasks.celery_app import celery_app


@celery_app.task(bind=True, name="app.tasks.data.process_import")
def process_import(self, user_id: str, content: str, filename: str):
    """データインポート処理"""
    self.update_state(
        state="PROCESSING",
        meta={"progress": 0, "total": 0, "errors": []},
    )

    errors = []
    records = []

    try:
        if filename.endswith(".json"):
            records = json.loads(content)
        else:
            # CSV parsing
            reader = csv.DictReader(io.StringIO(content))
            records = list(reader)
    except Exception as e:
        return {"status": "failed", "errors": [str(e)]}

    total = len(records)
    processed = 0

    for i, record in enumerate(records):
        try:
            # TODO: Process each record
            # 1. Find book by ISBN or title in DB
            # 2. If not found, create as custom book
            # 3. Add to user's bookshelf with status/rating/memo
            processed += 1
        except Exception as e:
            errors.append(f"Row {i + 1}: {str(e)}")

        if i % 10 == 0:
            self.update_state(
                state="PROCESSING",
                meta={"progress": i + 1, "total": total, "errors": errors},
            )

    return {
        "status": "completed",
        "processed": processed,
        "total": total,
        "errors": errors,
    }


@celery_app.task(bind=True, name="app.tasks.data.process_export")
def process_export(
    self, user_id: str, format_type: str, include_images: bool = False
):
    """データエクスポート処理"""
    self.update_state(
        state="PROCESSING",
        meta={"progress": 0, "total": 100, "errors": []},
    )

    export_dir = "/data/exports"
    os.makedirs(export_dir, exist_ok=True)

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"{export_dir}/{user_id}_{timestamp}.{format_type}"

    # TODO: Query user's books, reading logs, reviews
    # and write to the appropriate format

    self.update_state(
        state="PROCESSING",
        meta={"progress": 50, "total": 100, "errors": []},
    )

    # Placeholder: create empty file
    with open(filename, "w") as f:
        if format_type == "json":
            json.dump({"books": [], "reading_logs": [], "reviews": []}, f)
        else:
            writer = csv.writer(f)
            writer.writerow(
                ["isbn", "title", "authors", "status", "rating", "memo"]
            )

    return filename
