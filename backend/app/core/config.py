
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator


class Settings(BaseSettings):
    APP_NAME: str = "LeadFlow AI"
    APP_ENV: str = "development"
    DEBUG: bool = False

    DATABASE_URL: str
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.5-flash-lite"

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    @model_validator(mode="after")
    def validate_jwt_configuration(self):
        secret = self.JWT_SECRET_KEY.strip()
        environment = self.APP_ENV.strip().lower()

        if not secret:
            raise ValueError("JWT_SECRET_KEY must not be empty.")

        if secret == "development-only-secret-change-this":
            if environment in {"production", "prod"}:
                raise ValueError(
                    "A secure JWT_SECRET_KEY is required in production."
                )

        if self.JWT_ACCESS_TOKEN_EXPIRE_MINUTES <= 0:
            raise ValueError(
                "JWT_ACCESS_TOKEN_EXPIRE_MINUTES must be positive."
            )

        return self


settings = Settings()
