"""
Extensible rule-based skill dictionary for SMARTMATCH.
Maps canonical skill names to aliases/variants and skill categories.
"""

import re
from typing import Dict, List, Set

SKILL_DICTIONARY: Dict[str, Dict[str, List[str]]] = {
    "Programming Languages": {
        "Python": ["python", "python3", "py"],
        "JavaScript": ["javascript", "js", "ecmascript", "es6"],
        "TypeScript": ["typescript", "ts"],
        "Java": ["java", "core java", "java 8", "java 11", "java 17"],
        "C++": ["c++", "cpp"],
        "C#": ["c#", "csharp", ".net", "dotnet"],
        "C": ["c programming", "ansi c"],
        "Go": ["golang", "go language"],
        "Rust": ["rust", "rustlang"],
        "SQL": ["sql", "t-sql", "pl/sql", "plsql", "mysql", "postgresql", "postgres", "sqlite", "mssql"],
        "R": ["r programming", "r language", "rstudio"],
        "Scala": ["scala"],
        "PHP": ["php", "laravel"],
        "Ruby": ["ruby", "ruby on rails", "rails"],
        "Kotlin": ["kotlin"],
        "Swift": ["swift"],
        "Bash": ["bash", "shell scripting", "shell script", "powershell"],
    },
    "Frontend & UI": {
        "React": ["react", "reactjs", "react.js"],
        "Next.js": ["next.js", "nextjs"],
        "Vue.js": ["vue", "vuejs", "vue.js"],
        "Angular": ["angular", "angularjs"],
        "HTML": ["html", "html5"],
        "CSS": ["css", "css3", "scss", "sass"],
        "Tailwind CSS": ["tailwind", "tailwindcss", "tailwind css"],
        "Bootstrap": ["bootstrap"],
        "Redux": ["redux", "redux toolkit"],
        "Vite": ["vite", "vitejs"],
        "Figma": ["figma"],
        "UI/UX Design": ["ui/ux", "ux design", "ui design", "wireframing", "prototyping"],
    },
    "Backend & APIs": {
        "FastAPI": ["fastapi"],
        "Django": ["django", "django rest framework", "drf"],
        "Flask": ["flask"],
        "Node.js": ["node.js", "nodejs", "node"],
        "Express.js": ["express", "express.js", "expressjs"],
        "Spring Boot": ["spring boot", "springboot", "spring framework"],
        "REST API": ["rest", "rest api", "restful", "restful apis"],
        "GraphQL": ["graphql"],
        "Microservices": ["microservices", "microservice architecture"],
        "SQLAlchemy": ["sqlalchemy"],
        "Pydantic": ["pydantic"],
        "JWT": ["jwt", "json web token"],
        "OAuth": ["oauth", "oauth2", "oidc"],
    },
    "Data Science & ML": {
        "Machine Learning": ["machine learning", "ml", "supervised learning", "unsupervised learning"],
        "Deep Learning": ["deep learning", "neural networks", "cnn", "rnn"],
        "NLP": ["nlp", "natural language processing", "text mining", "tf-idf", "tfidf"],
        "Scikit-learn": ["scikit-learn", "sklearn", "scikit learn"],
        "Pandas": ["pandas"],
        "NumPy": ["numpy"],
        "TensorFlow": ["tensorflow", "keras"],
        "PyTorch": ["pytorch"],
        "Data Analysis": ["data analysis", "data analytics", "exploratory data analysis", "eda"],
        "Data Visualization": ["data visualization", "matplotlib", "seaborn", "plotly", "tableau", "power bi", "powerbi"],
        "Statistics": ["statistics", "statistical analysis", "hypothesis testing", "a/b testing", "regression"],
        "Feature Engineering": ["feature engineering"],
        "Computer Vision": ["computer vision", "opencv"],
    },
    "Data Engineering & Databases": {
        "ETL": ["etl", "elt", "data pipeline", "data pipelines"],
        "Apache Spark": ["spark", "apache spark", "pyspark"],
        "Apache Airflow": ["airflow", "apache airflow"],
        "Apache Kafka": ["kafka", "apache kafka"],
        "MongoDB": ["mongodb", "mongo"],
        "Redis": ["redis"],
        "Snowflake": ["snowflake"],
        "BigQuery": ["bigquery", "google bigquery"],
        "Data Warehousing": ["data warehouse", "data warehousing", "redshift"],
    },
    "Cloud & DevOps": {
        "AWS": ["aws", "amazon web services", "ec2", "s3", "lambda", "rds"],
        "Google Cloud": ["gcp", "google cloud", "google cloud platform"],
        "Azure": ["azure", "microsoft azure"],
        "Docker": ["docker", "containerization", "dockerfile"],
        "Kubernetes": ["kubernetes", "k8s"],
        "CI/CD": ["ci/cd", "cicd", "github actions", "jenkins", "gitlab ci"],
        "Terraform": ["terraform", "iac"],
        "Linux": ["linux", "ubuntu", "centos"],
        "Git": ["git", "github", "gitlab", "bitbucket"],
        "Nginx": ["nginx"],
    },
    "Testing & Agile": {
        "Pytest": ["pytest", "unittest"],
        "Unit Testing": ["unit testing", "integration testing", "tdd", "test driven development"],
        "Selenium": ["selenium", "playwright", "cypress"],
        "Agile": ["agile", "scrum", "kanban", "jira"],
    },
}


def _build_alias_index() -> Dict[str, str]:
    alias_to_canonical: Dict[str, str] = {}
    for _category, skills in SKILL_DICTIONARY.items():
        for canonical, aliases in skills.items():
            alias_to_canonical[canonical.lower()] = canonical
            for alias in aliases:
                alias_to_canonical[alias.lower()] = canonical
    return alias_to_canonical


ALIAS_TO_CANONICAL: Dict[str, str] = _build_alias_index()


def normalize_skill(skill_name: str) -> str:
    """Normalize a skill string to its canonical form if known, else clean title/stripped text."""
    cleaned = re.sub(r"\s+", " ", skill_name.strip())
    if not cleaned:
        return ""
    lowered = cleaned.lower()
    if lowered in ALIAS_TO_CANONICAL:
        return ALIAS_TO_CANONICAL[lowered]
    return cleaned


def normalize_skill_list(skills: List[str]) -> List[str]:
    """Deduplicate and normalize a list of skill strings preserving order."""
    seen: Set[str] = set()
    result: List[str] = []
    for skill in skills or []:
        norm = normalize_skill(skill)
        if norm and norm.lower() not in seen:
            seen.add(norm.lower())
            result.append(norm)
    return result


def extract_skills_from_text(text: str, extra_skills: List[str] | None = None) -> List[str]:
    """
    Extract skills from free text using boundary-aware matching against
    the extensible skill dictionary plus any optional extra target skills.
    """
    if not text or not text.strip():
        return []

    lowered = text.lower()
    found: Dict[str, str] = {}

    # Sort aliases by length descending so multi-word skills match before sub-tokens
    aliases = sorted(ALIAS_TO_CANONICAL.keys(), key=len, reverse=True)
    for alias in aliases:
        # Handle special characters like c++, c#, .net, node.js safely
        escaped = re.escape(alias)
        pattern = rf"(?<![a-z0-9]){escaped}(?![a-z0-9])"
        if re.search(pattern, lowered):
            canonical = ALIAS_TO_CANONICAL[alias]
            found[canonical.lower()] = canonical

    if extra_skills:
        for raw_skill in extra_skills:
            norm = normalize_skill(raw_skill)
            if not norm:
                continue
            escaped = re.escape(raw_skill.strip().lower())
            pattern = rf"(?<![a-z0-9]){escaped}(?![a-z0-9])"
            if re.search(pattern, lowered):
                found[norm.lower()] = norm

    return list(found.values())


def get_skill_categories() -> Dict[str, List[str]]:
    """Return all canonical skills grouped by category."""
    return {cat: list(skills.keys()) for cat, skills in SKILL_DICTIONARY.items()}
