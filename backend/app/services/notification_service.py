from sqlalchemy.orm import Session
from app.models.models import Notification


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notif_type: str = "system",
    related_id: int | None = None,
) -> Notification:
    """Create and persist an in-app notification for a user."""
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=notif_type,
        related_id=related_id,
    )
    db.add(notification)
    return notification
