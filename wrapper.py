import requests
from bs4 import BeautifulSoup

def get_constraints(problem_name):

    url = "https://leetcode.com/graphql"

    query = """
    query questionData($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
        questionId
        title
        titleSlug
        content
        difficulty
        likes
        dislikes
        exampleTestcases
        codeSnippets {
        lang
        langSlug
        code
        }
        topicTags {
        name
        slug
        }
    }
    }
    """

    variables = {
        "titleSlug": problem_name 
    }

    payload = {
        "query": query,
        "variables": variables
    }

    response = requests.post(url, json=payload)


    content_html = response.json()["data"]["question"]["content"].replace("<sup>", "^").replace("</sup>", "")

    cutoff = content_html.index("Constraints:")

    print(BeautifulSoup(content_html[cutoff:], "html.parser").get_text())
    return BeautifulSoup(content_html[cutoff:], "html.parser").get_text()

get_constraints("two-sum")