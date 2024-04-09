import json
import logging
from logging.handlers import RotatingFileHandler
import os
import requests
from dsp import LM
import backoff
from dsp.modules.cache_utils import CacheMemory, NotebookCacheMemory, cache_turn_on

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        RotatingFileHandler('deepinfra_usage.log', maxBytes=5000000, backupCount=5)
    ]
)

# Define specialized exception classes for handling API errors
class DeepInfraError(Exception):
    pass

class RateLimitError(DeepInfraError):
    pass

class ServiceUnavailableError(DeepInfraError):
    pass

class APIError(DeepInfraError):
    pass

# Mapping common HTTP error statuses to custom exception classes
ERRORS = {
    429: RateLimitError,
    503: ServiceUnavailableError,
    500: APIError,
}

def backoff_hdlr(details):
    """Handler function for backoff-related logging"""
    logging.warning(
        "Backing off {wait:0.1f} seconds after {tries} tries "
        "calling function {target} with kwargs "
        "{kwargs}".format(**details)
    )

class DeepInfraClient(LM):
    def __init__(self, api_key, model="cognitivecomputations/dolphin-2.6-mixtral-8x7b", **kwargs):
        super().__init__(model)
        self.api_key = api_key
        self.base_url = f"https://api.deepinfra.com/v1/inference/{model}"
        self.provider = "deepinfra"
        self.history = []
        self.kwargs = kwargs

    def log_usage(self, response):
        """Log usage information based on the response from the DeepInfra API."""
        total_tokens = response.get('num_tokens')
        if total_tokens:
            logging.info(f'Total tokens: {total_tokens}')

    @backoff.on_exception(
        backoff.expo,
        ERRORS.values(),
        max_time=60,
        on_backoff=backoff_hdlr,
    )
    def basic_request(self, prompt: str, **kwargs):
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        
        # Merging class-level kwargs with method-level kwargs
        full_kwargs = {**self.kwargs, **kwargs}
        data = {
            "input": prompt,
            **full_kwargs,
        }

        response = requests.post(self.base_url, headers=headers, json=data)
        if response.status_code in ERRORS:
            raise ERRORS[response.status_code](response.text)
        
        response_json = response.json()
        self.log_usage(response_json)

        # Recording API call details for debugging or analytical purposes
        self.history.append({
            "prompt": prompt,
            "response": response_json,
            **kwargs,
        })

        return response_json

    def __call__(self, prompt: str, **kwargs):
        response = self.basic_request(prompt, **kwargs)
        completions = [result['generated_text'] for result in response.get('results', [])]
        return completions
    
def main():
    # Initialize the DeepInfra client with your API key and the model you wish to use
    client = DeepInfraClient(api_key=os.getenv('DEEPINFRA_KEY'), model="cognitivecomputations/dolphin-2.6-mixtral-8x7b")
    
    # Define a prompt to send to the model
    prompt = "Describe the significance of machine learning in data analysis."
    
    # Make the request and get the completions
    completions = client(prompt)
    
    # Print out the completions
    for idx, completion in enumerate(completions, start=1):
        print(f"Completion {idx}: {completion}")
        

if __name__ == "__main__":
    main()