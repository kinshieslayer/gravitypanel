"""
Instagram API integration via Meta Graph API.
Handles publishing reels/posts and fetching analytics.
"""

import requests
from typing import Optional


BASE_URL = "https://graph.facebook.com/v19.0"


class InstagramAPI:
    """Wrapper around the Meta Graph API for Instagram Business accounts."""

    def __init__(self, access_token: str, ig_user_id: str):
        self.access_token = access_token
        self.ig_user_id = ig_user_id

    def _headers(self):
        return {"Authorization": f"Bearer {self.access_token}"}

    # ------------------------------------------------------------------
    # Publishing
    # ------------------------------------------------------------------

    def publish_reel(self, video_url: str, caption: str) -> dict:
        """
        Publish a reel (video) to Instagram via the Content Publishing API.
        The video must be hosted at a publicly accessible URL.
        Steps: 1) Create media container  2) Publish container
        """
        try:
            # Step 1 – create container
            container_resp = requests.post(
                f"{BASE_URL}/{self.ig_user_id}/media",
                params={
                    "media_type": "REELS",
                    "video_url": video_url,
                    "caption": caption,
                    "access_token": self.access_token,
                },
                timeout=60,
            )
            container_resp.raise_for_status()
            container_id = container_resp.json().get("id")
            if not container_id:
                return {"success": False, "error": "No container ID returned"}

            # Step 2 – publish
            publish_resp = requests.post(
                f"{BASE_URL}/{self.ig_user_id}/media_publish",
                params={
                    "creation_id": container_id,
                    "access_token": self.access_token,
                },
                timeout=60,
            )
            publish_resp.raise_for_status()
            return {"success": True, "data": publish_resp.json()}

        except requests.RequestException as exc:
            return {"success": False, "error": str(exc)}

    def publish_photo(self, image_url: str, caption: str) -> dict:
        """Publish a single photo post."""
        try:
            container_resp = requests.post(
                f"{BASE_URL}/{self.ig_user_id}/media",
                params={
                    "image_url": image_url,
                    "caption": caption,
                    "access_token": self.access_token,
                },
                timeout=60,
            )
            container_resp.raise_for_status()
            container_id = container_resp.json().get("id")
            if not container_id:
                return {"success": False, "error": "No container ID returned"}

            publish_resp = requests.post(
                f"{BASE_URL}/{self.ig_user_id}/media_publish",
                params={
                    "creation_id": container_id,
                    "access_token": self.access_token,
                },
                timeout=60,
            )
            publish_resp.raise_for_status()
            return {"success": True, "data": publish_resp.json()}

        except requests.RequestException as exc:
            return {"success": False, "error": str(exc)}

    # ------------------------------------------------------------------
    # Analytics
    # ------------------------------------------------------------------

    def get_profile_info(self) -> dict:
        """Fetch basic profile info: followers, media count, etc."""
        try:
            resp = requests.get(
                f"{BASE_URL}/{self.ig_user_id}",
                params={
                    "fields": "followers_count,media_count,username,name,profile_picture_url",
                    "access_token": self.access_token,
                },
                timeout=30,
            )
            resp.raise_for_status()
            return {"success": True, "data": resp.json()}
        except requests.RequestException as exc:
            return {"success": False, "error": str(exc)}

    def get_insights(self, metric: str = "impressions,reach,profile_views",
                     period: str = "day", since: Optional[int] = None,
                     until: Optional[int] = None) -> dict:
        """
        Fetch account-level insights.
        Metrics: impressions, reach, profile_views, follower_count, etc.
        Period: day, week, days_28, month, lifetime
        """
        try:
            params: dict = {
                "metric": metric,
                "period": period,
                "access_token": self.access_token,
            }
            if since:
                params["since"] = since
            if until:
                params["until"] = until

            resp = requests.get(
                f"{BASE_URL}/{self.ig_user_id}/insights",
                params=params,
                timeout=30,
            )
            resp.raise_for_status()
            return {"success": True, "data": resp.json().get("data", [])}
        except requests.RequestException as exc:
            return {"success": False, "error": str(exc)}

    def get_top_media(self, limit: int = 10) -> dict:
        """Fetch recent media sorted by engagement."""
        try:
            resp = requests.get(
                f"{BASE_URL}/{self.ig_user_id}/media",
                params={
                    "fields": "id,caption,media_type,timestamp,like_count,comments_count,permalink",
                    "limit": limit,
                    "access_token": self.access_token,
                },
                timeout=30,
            )
            resp.raise_for_status()
            media = resp.json().get("data", [])
            # Sort by engagement (likes + comments)
            media.sort(
                key=lambda m: (m.get("like_count", 0) + m.get("comments_count", 0)),
                reverse=True,
            )
            return {"success": True, "data": media}
        except requests.RequestException as exc:
            return {"success": False, "error": str(exc)}
