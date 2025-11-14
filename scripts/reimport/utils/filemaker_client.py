"""
FileMaker API client for reimport process.

Provides unified interface to:
- FileMaker Data API (layout-based access)
- FileMaker OData API (direct table access)

Handles authentication, pagination, and error handling.
"""

import os
import time
import requests
from typing import Dict, List, Optional, Any
from urllib.parse import urljoin


class FileMakerClient:
    """Client for FileMaker Data API and OData API."""
    
    def __init__(
        self,
        host: str = None,
        database: str = None,
        username: str = None,
        password: str = None,
    ):
        """
        Initialize FileMaker client.
        
        Args:
            host: FileMaker Server hostname (e.g., 'walkeasy.fmcloud.fm')
            database: Database name (e.g., 'WEP-DatabaseV2')
            username: FileMaker username
            password: FileMaker password
        """
        self.host = host or os.getenv('FILEMAKER_HOST', 'walkeasy.fmcloud.fm')
        self.database = database or os.getenv('FILEMAKER_DATABASE', 'WEP-DatabaseV2')
        self.username = username or os.getenv('FILEMAKER_USERNAME')
        self.password = password or os.getenv('FILEMAKER_PASSWORD')
        
        if not self.username or not self.password:
            raise ValueError("FileMaker credentials not provided")
        
        # Data API settings
        self.data_api_base_url = f"https://{self.host}/fmi/data/v1/databases/{self.database}"
        self.data_api_token = None
        self.token_expiry = None
        
        # OData API settings
        self.odata_base_url = f"https://{self.host}/fmi/odata/v4/{self.database}"
        self.odata_auth = (self.username, self.password)
        
        # Session for connection pooling
        self.session = requests.Session()
        self.session.verify = True  # Verify SSL certificates
    
    # ========================================
    # Data API Methods (Layout-Based Access)
    # ========================================
    
    def _get_data_api_token(self) -> str:
        """Get or refresh Data API authentication token."""
        # Check if token is still valid
        if self.data_api_token and self.token_expiry and time.time() < self.token_expiry:
            return self.data_api_token
        
        # Request new token
        url = urljoin(self.data_api_base_url, 'sessions')
        headers = {'Content-Type': 'application/json'}
        
        response = self.session.post(
            url,
            auth=(self.username, self.password),
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            self.data_api_token = data['response']['token']
            # Token expires after 15 minutes of inactivity
            self.token_expiry = time.time() + (14 * 60)  # Refresh after 14 minutes
            return self.data_api_token
        else:
            raise Exception(f"Failed to get Data API token: {response.status_code} - {response.text}")
    
    def data_api_find_records(
        self,
        layout: str,
        query: Optional[Dict] = None,
        offset: int = 1,
        limit: int = 100,
    ) -> List[Dict]:
        """
        Find records using Data API.
        
        Args:
            layout: Layout name
            query: Query criteria
            offset: Record offset (1-based)
            limit: Max records to return
        
        Returns:
            List of record dictionaries
        """
        token = self._get_data_api_token()
        url = urljoin(self.data_api_base_url, f'layouts/{layout}/_find')
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {token}'
        }
        
        payload = {
            'query': query or [{}],  # Empty query = get all
            'offset': str(offset),
            'limit': str(limit)
        }
        
        response = self.session.post(url, json=payload, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            return data['response']['data']
        else:
            raise Exception(f"Data API find failed: {response.status_code} - {response.text}")
    
    # ========================================
    # OData API Methods (Direct Table Access)
    # ========================================
    
    def odata_query(
        self,
        entity: str,
        select: Optional[List[str]] = None,
        filter_query: Optional[str] = None,
        top: int = 100,
        skip: int = 0,
        orderby: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Query OData API.
        
        Args:
            entity: Entity name (table name)
            select: List of fields to select
            filter_query: OData $filter query
            top: Max records to return
            skip: Number of records to skip
            orderby: OData $orderby field
        
        Returns:
            OData response dictionary with 'value' list
        """
        url = f"{self.odata_base_url}/{entity}"
        
        params = {
            '$top': top,
            '$skip': skip,
        }
        
        if select:
            params['$select'] = ','.join(select)
        
        if filter_query:
            params['$filter'] = filter_query
        
        if orderby:
            params['$orderby'] = orderby
        
        response = self.session.get(url, params=params, auth=self.odata_auth)
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"OData query failed: {response.status_code} - {response.text}")
    
    def odata_get_all(
        self,
        entity: str,
        select: Optional[List[str]] = None,
        filter_query: Optional[str] = None,
        batch_size: int = 100,
    ) -> List[Dict]:
        """
        Get all records from OData entity with automatic pagination.
        
        Args:
            entity: Entity name (table name)
            select: List of fields to select
            filter_query: OData $filter query
            batch_size: Records per request
        
        Returns:
            List of all records
        """
        all_records = []
        skip = 0
        
        while True:
            response = self.odata_query(
                entity=entity,
                select=select,
                filter_query=filter_query,
                top=batch_size,
                skip=skip
            )
            
            records = response.get('value', [])
            if not records:
                break
            
            all_records.extend(records)
            skip += len(records)
            
            # If we got fewer records than batch_size, we're done
            if len(records) < batch_size:
                break
        
        return all_records
    
    # ========================================
    # Convenience Methods
    # ========================================
    
    def get_all_patients(self) -> List[Dict]:
        """Get all patients from FileMaker via OData."""
        return self.odata_get_all(entity='@Contacts')
    
    def get_all_appointments(self) -> List[Dict]:
        """Get all appointments from FileMaker via OData."""
        return self.odata_get_all(entity='@Appointment')  # Adjust entity name as needed
    
    def get_contact_details(self, patient_id: str) -> List[Dict]:
        """
        Get contact details for a specific patient.
        
        Args:
            patient_id: FileMaker patient UUID
        
        Returns:
            List of contact detail records
        """
        filter_query = f"id___key eq '{patient_id}'"
        return self.odata_get_all(
            entity='@Contact_Details',  # Adjust entity name as needed
            filter_query=filter_query
        )
    
    def test_connection(self) -> bool:
        """
        Test FileMaker connection.
        
        Returns:
            True if connection successful, False otherwise
        """
        try:
            # Try OData API (simpler, no token required)
            url = f"{self.odata_base_url}/$metadata"
            response = self.session.get(url, auth=self.odata_auth)
            return response.status_code == 200
        except Exception:
            return False
    
    def close(self):
        """Close session and clean up."""
        if self.session:
            self.session.close()
    
    def __enter__(self):
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()


# Convenience function for creating client
def create_filemaker_client() -> FileMakerClient:
    """
    Create FileMaker client with credentials from environment.
    
    Returns:
        FileMakerClient instance
    """
    return FileMakerClient()

