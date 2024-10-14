



import { Controller, Get, Res, Post,Body, Query, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import * as qs from 'qs';

@Controller('zoho-bookings')
export class ZohoBookingsController {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  //private readonly authorizationCode: string;    -------> self-client application
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get<string>('ZOHO_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('ZOHO_CLIENT_SECRET');
    this.redirectUri = this.configService.get<string>('ZOHO_REDIRECT_URI');
    //this.authorizationCode = this.configService.get<string>('ZOHO_AUTH_CODE');  -------> self-client application
  }

  /* self-client application method to get access and refresh token as mentioned in api documentation
  // Get access and refresh tokens
  @Get('get-tokens')
  async getTokens(@Res() res: Response) {
    const tokenUrl = `https://accounts.zoho.in/oauth/v2/token`;

    try {
      const response = await axios.post(tokenUrl, null, {
        params: {
          grant_type: 'authorization_code',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUri,
          code: this.authorizationCode, // Authorization code from Zoho API Console
        },
      });

      const { access_token, refresh_token } = response.data;

      // Store the access token to be used for API requests
      this.accessToken = access_token;

      // Render tokens in JSON format
      res.status(HttpStatus.OK).json({
        accessToken: access_token,
        refreshToken: refresh_token,
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }
*/


//server-side application method to get access and refresh token

@Get('authorize')
async redirectToAuth(@Res() res: Response) {
  const authUrl = `https://accounts.zoho.in/oauth/v2/auth?scope=Zohobookings.data.CREATE&client_id=${this.clientId}&response_type=code&redirect_uri=${this.redirectUri}&access_type=offline&prompt=consent`;
  return res.redirect(authUrl);
}
@Get('callback')
async handleCallback(@Query('code') code: string, @Res() res: Response) {
  if (!code) {
    return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Authorization code is required' });
  }

  const tokenUrl = 'https://accounts.zoho.in/oauth/v2/token';

  try {
    // Exchange authorization code for access and refresh tokens
    const response = await axios.post(tokenUrl, null, {
      params: {
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        code,
      },
    });

    const { access_token, refresh_token } = response.data;

    // Store the access token and refresh token
    this.accessToken = access_token;
    this.refreshToken = refresh_token;

    // Respond with the tokens
    res.status(HttpStatus.OK).json({
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
    });
  } catch (error) {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
}




  // Book appointment using the dynamic access token
  @Get('book-appointment')
  async bookAppointment(
    @Query('service_id') service_id: string,
    @Query('staff_id') staff_id: string,
    @Query('resource_id') resource_id: string,
    @Query('from_time') from_time: string,
    @Query('to_time') to_time: string,
    @Query('timezone') timezone: string,
    @Query('customer_details') customer_details: string, // JSON stringified format
    @Query('notes') notes: string,
    @Query('additional_fields') additional_fields: string, // JSON stringified format
    @Res() res: Response
  ) {
    const url = 'https://www.zohoapis.in/bookings/v1/json/appointment';

    // Check if the access token is available
    if (!this.accessToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Access token not available. Please fetch tokens first.' });
    }

    try {
      // Prepare form-data for POST request
      const formData = qs.stringify({
        service_id,
        staff_id,
        resource_id,
        from_time,
        to_time,
        timezone,
        customer_details, // Pass customer_details as a string
        notes,
        additional_fields, // Pass additional_fields as a string
      });

      const response = await axios.post(
        url,
        formData, // URL-encoded form-data
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${this.accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded', // Correct content type
          },
        }
      );

      return res.status(HttpStatus.OK).json(response.data);
    } catch (error) {
      console.error('Error booking appointment:', error.response?.data || error.message); // Log detailed error
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.response?.data?.response?.errormessage || error.message
      });
    }
  }


  @Get('get-appointment')
  async getAppointment(
    @Query('booking_id') booking_id: string,
    @Res() res: Response
  ) {
    const url = 'https://www.zohoapis.in/bookings/v1/json/getappointment';

    // Check if the access token is available
    if (!this.accessToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Access token not available. Please fetch tokens first.' });
    }

    try {
      const response = await axios.get(
        `${url}?booking_id=${booking_id}`, // Append booking_id to the request URL
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${this.accessToken}`,
          },
        }
      );

      return res.status(HttpStatus.OK).json(response.data);
    } catch (error) {
      console.error('Error fetching appointment:', error.response?.data || error.message); // Log detailed error
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.response?.data?.response?.errormessage || error.message
      });
    }
  }


  @Get('fetch-appointment')
  async fetchAppointment(
    @Res() res: Response,
    @Query('service_id') serviceId?: string, 
    @Query('staff_id') staffId?: string, 
    @Query('resource_id') resourceId?: string, 
    @Query('from_time') fromTime?: string, 
    @Query('to_time') toTime?: string, 
    @Query('status') status?: string, 
    @Query('page') page?: number, 
    @Query('need_customer_more_info') needCustomerMoreInfo?: string, 
    @Query('customer_name') customerName?: string, 
    @Query('customer_email') customerEmail?: string, 
    @Query('customer_phone_number') customerPhoneNumber?: string,
  
  ) {
    const url = 'https://www.zohoapis.in/bookings/v1/json/fetchappointment';


    if (!this.accessToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Access token not available. Please fetch tokens first.' });
    }

    try {
      // Prepare form-data
      const formData = qs.stringify({
        service_id: serviceId,
        staff_id: staffId,
        resource_id: resourceId,
        from_time: fromTime,
        to_time: toTime,
        status: status,
        page: page,
        need_customer_more_info: needCustomerMoreInfo,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone_number: customerPhoneNumber,
      });

      // Send POST request to fetch appointments
      const response = await axios.post(
        url,
        formData, // URL-encoded form-data
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${this.accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded', 
          },
        }
      );

      // Send back the response to the client
      return res.status(HttpStatus.OK).json(response.data);
    } catch (error) {
      console.error('Error fetching appointments:', error.response?.data || error.message);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.response?.data?.response?.errormessage || error.message,
      });
    }
  }

  @Get('update-appointment')
  async updateAppointment(
    @Query('booking_id') booking_id: string,
    @Query('action') action: 'completed' | 'cancel' | 'noshow',
    @Res() res: Response
  ) {
    const url = `https://www.zohoapis.in/bookings/v1/json/updateappointment`;

    // Check if the access token is available
    if (!this.accessToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Access token not available. Please fetch tokens first.' });
    }

    try {
      // Prepare form-data for POST request
      const formData = qs.stringify({
        booking_id,
        action,
      });

      const response = await axios.post(
        url,
        formData, // URL-encoded form-data
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${this.accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded', // Correct content type
          },
        }
      );

      return res.status(HttpStatus.OK).json(response.data);
    } catch (error) {
      console.error('Error updating appointment:', error.response?.data || error.message); // Log detailed error
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.response?.data?.response?.errormessage || error.message
      });
    }
  }


  @Get('create-workspace')
  async createWorkspace(
    @Query('name') name: string, // Query parameter to pass the workspace name
    @Res() res: Response
  ) {
    const url = 'https://www.zohoapis.in/bookings/v1/json/createworkspace';

    // Check if the access token is available
    if (!this.accessToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Access token not available. Please fetch tokens first.' });
    }

    try {
      // Prepare form-data
      const formData = qs.stringify({
        name, // Name of the workspace to be passed as form-data
      });

      // Send POST request to create a workspace
      const response = await axios.post(
        url,
        formData, // URL-encoded form-data
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${this.accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded', // Specify form-data encoding
          },
        }
      );

      // Send back the response to the client
      return res.status(HttpStatus.OK).json(response.data);
    } catch (error) {
      console.error('Error creating workspace:', error.response?.data || error.message);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.response?.data?.response?.errormessage || error.message,
      });
    }
  }

  @Get('update-workspace')
  async updateWorkspace(
    @Query('workspaceId') workspaceId: string,  // Mandatory parameter
    @Query('name') name: string, // At least one parameter is mandatory in dataMap
    @Res() res: Response
  ) {
    const url = 'https://www.zohoapis.in/bookings/v1/json/updateworkspace';

    // Check if the access token is available
    if (!this.accessToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Access token not available. Please fetch tokens first.' });
    }

    try {
      // Prepare the dataMap object with the mandatory parameter
      const dataMap = {
        name,  // Only 'name' is included as a mandatory parameter in dataMap
      };

      // Prepare form-data
      const formData = qs.stringify({
        workspaceId, // Mandatory parameter
        dataMap: JSON.stringify(dataMap), // Pass dataMap as a stringified object
      });

      // Send POST request to update the workspace
      const response = await axios.post(
        url,
        formData, // URL-encoded form-data
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${this.accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded', // Specify form-data encoding
          },
        }
      );

      // Send back the response to the client
      return res.status(HttpStatus.OK).json(response.data);
    } catch (error) {
      console.error('Error updating workspace:', error.response?.data || error.message);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.response?.data?.response?.errormessage || error.message,
      });
    }
  }

  @Get('fetch-workspaces')
  async fetchWorkspaces(
    @Res() res: Response,
    @Query('workspace_id') workspace_id?: string, // Optional parameter
  
  ) {
    const url = 'https://www.zohoapis.in/bookings/v1/json/workspaces';

    // Check if the access token is available
    if (!this.accessToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Access token not available. Please fetch tokens first.' });
    }

    try {
      // Prepare the request URL with optional workspace_id
      const requestUrl = workspace_id ? `${url}?workspace_id=${workspace_id}` : url;

      // Send GET request to fetch workspaces
      const response = await axios.get(requestUrl, {
        headers: {
          Authorization: `Zoho-oauthtoken ${this.accessToken}`,
        },
      });

      // Return the response data
      return res.status(HttpStatus.OK).json(response.data);
    } catch (error) {
      console.error('Error fetching workspaces:', error.response?.data || error.message);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.response?.data?.response?.errormessage || error.message,
      });
    }
  }

  @Get('delete-workspace')
  async deleteWorkspace(
    @Query('workspaceId') workspaceId: string, // Mandatory parameter
    @Query('ignorePastAppointment') ignorePastAppointment: boolean = false, // Optional parameter with default value
    @Res() res: Response
  ) {
    const url = 'https://www.zohoapis.in/bookings/v1/json/deleteworkspace';

    // Check if the access token is available
    if (!this.accessToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Access token not available. Please fetch tokens first.' });
    }

    try {
      // Prepare form-data for the POST request
      const formData = qs.stringify({
        workspaceId,
        ignorePastAppointment,
      });

      // Send POST request to delete the workspace
      const response = await axios.post(
        url,
        formData, // URL-encoded form-data
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${this.accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      // Return the response data
      return res.status(HttpStatus.OK).json(response.data);
    } catch (error) {
      console.error('Error deleting workspace:', error.response?.data || error.message);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.response?.data?.response?.errormessage || error.message,
      });
    }
  }

  @Get('fetch-resources')
  async fetchResources(
    @Res() res: Response,
    @Query('resource_id') resource_id?: string, // Optional
    @Query('service_id') service_id?: string,   // Optional
    
  ) {
    const url = 'https://www.zohoapis.in/bookings/v1/json/resources';

    // Check if the access token is available
    if (!this.accessToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Access token not available. Please fetch tokens first.' });
    }

    try {
      // Prepare query parameters
      const queryParams = new URLSearchParams({
        resource_id: resource_id || '',
        service_id: service_id || '',
      }).toString();

      // Send GET request to fetch resources
      const response = await axios.get(
        `${url}?${queryParams}`,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${this.accessToken}`,
          },
        }
      );

      // Return the response data
      return res.status(HttpStatus.OK).json(response.data);
    } catch (error) {
      console.error('Error fetching resources:', error.response?.data || error.message);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.response?.data?.response?.errormessage || error.message,
      });
    }
  }

  @Get('fetch-staff')
  async fetchStaff(
    @Res() res: Response,
    @Query('staff_id') staff_id?: string, // Optional
    @Query('service_id') service_id?: string,   // Optional
    
  ) {
    const url = 'https://www.zohoapis.in/bookings/v1/json/staffs';

    // Check if the access token is available
    if (!this.accessToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Access token not available. Please fetch tokens first.' });
    }

    try {
      // Prepare query parameters
      const queryParams = new URLSearchParams({
        staff_id: staff_id || '',
        service_id: service_id || '',
      }).toString();

      // Send GET request to fetch resources
      const response = await axios.get(
        `${url}?${queryParams}`,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${this.accessToken}`,
          },
        }
      );

      // Return the response data
      return res.status(HttpStatus.OK).json(response.data);
    } catch (error) {
      console.error('Error fetching staffs:', error.response?.data || error.message);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.response?.data?.response?.errormessage || error.message,
      });
    }
  }

  @Get('fetch-services')
  async fetchServices(
    @Query('workspace_id') workspace_id: string, 
    @Res() res: Response, // Mandatory
    @Query('service_id') service_id?: string,     // Optional
    @Query('staff_id') staff_id?: string,         // Optional
  
  ) {
    const url = 'https://www.zohoapis.in/bookings/v1/json/services';

    // Check if the access token is available
    if (!this.accessToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Access token not available. Please fetch tokens first.' });
    }

    try {
      // Prepare query parameters
      const queryParams = new URLSearchParams({
        workspace_id,
        service_id: service_id || '',
        staff_id: staff_id || '',
      }).toString();

      // Send GET request to fetch services
      const response = await axios.get(
        `${url}?${queryParams}`,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${this.accessToken}`,
          },
        }
      );

      // Return the response data
      return res.status(HttpStatus.OK).json(response.data);
    } catch (error) {
      console.error('Error fetching services:', error.response?.data || error.message);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.response?.data?.response?.errormessage || error.message,
      });
    }
  }


  @Get('add-staff')
  async addStaff(
    @Query('name') name: string,  // Staff name
    @Query('email') email: string,  // Staff email
    @Res() res: Response,
    @Query('gender') gender?: string,  // Staff gender
    @Query('role') role?: string,  // Staff role
    @Query('dob') dob?: string,  // Date of birth in the specified format
    @Query('additional_info') additionalInfo?: string,  // Additional info
    @Query('phone') phone?: string,  // Staff phone number
    @Query('designation') designation?: string,  // Staff designation
    @Query('assigned_services') assignedServices?: string[],  // Assigned services (array of IDs)
  
  ) {
    const url = 'https://www.zohoapis.in/bookings/v1/json/addstaff';

    // Check if the access token is available
    if (!this.accessToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Access token not available. Please fetch tokens first.' });
    }

    try {
      // Prepare form-data
      const formData = qs.stringify({
        staffMap: JSON.stringify({
          data: [
            {
              name,
              email,
              gender,
              role,
              dob,
              additional_info: additionalInfo,
              phone,
              designation,
              assigned_services: assignedServices || []
            }
          ]
        })
      });

      // Send POST request to add staff
      const response = await axios.post(
        url,
        formData, // URL-encoded form-data
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${this.accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded', // Specify form-data encoding
          },
        }
      );

      // Send back the response to the client
      return res.status(HttpStatus.OK).json(response.data);
    } catch (error) {
      console.error('Error adding staff:', error.response?.data || error.message);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.response?.data?.response?.errormessage || error.message,
      });
    }
  }

  @Get('fetch-availability')
  async fetchAvailability(
    @Query('service_id') serviceId: string,  // Service ID (mandatory)
    @Query('selected_date') selectedDate: string,  // Date to check availability (mandatory)
    @Res() res: Response,
    @Query('staff_id') staffId?: string,  // Staff ID (optional)
    @Query('group_id') groupId?: string,  // Group ID (optional)
    @Query('resource_id') resourceId?: string,  // Resource ID (optional)
    
  ) {
    const url = 'https://www.zohoapis.in/bookings/v1/json/availableslots';

    // Check if the access token is available
    if (!this.accessToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Access token not available. Please fetch tokens first.' });
    }

    try {
      // Prepare query parameters
      const queryParams = {
        service_id: serviceId,
        staff_id: staffId,
        group_id: groupId,
        resource_id: resourceId,
        selected_date: selectedDate
      };

      // Send GET request to fetch availability
      const response = await axios.get(url, {
        headers: {
          Authorization: `Zoho-oauthtoken ${this.accessToken}`,
        },
        params: queryParams,
      });

      // Send back the response to the client
      return res.status(HttpStatus.OK).json(response.data);
    } catch (error) {
      console.error('Error fetching availability:', error.response?.data || error.message);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.response?.data?.response?.errormessage || error.message,
      });
    }
  }

  @Get('reschedule-appointment')
  async rescheduleAppointment(
    @Query('booking_id') bookingId: string, // Query parameter for the booking ID
    @Res() res: Response,
    @Query('staff_id') staffId?: string, // Query parameter for the staff ID (optional)
    @Query('group_id') groupId?: string, // Query parameter for the group ID (optional)
    @Query('start_time') startTime?: string, // Query parameter for the new start time (optional)
   
  ) {
    const url = 'https://www.zohoapis.in/bookings/v1/json/rescheduleappointment';

    // Check if the access token is available
   
    if (!this.accessToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Access token not available. Please fetch tokens first.' });
    }

    try {
      // Prepare form-data
      const formData = qs.stringify({
        booking_id: bookingId,
        staff_id: staffId,
        group_id: groupId,
        start_time: startTime,
      });

      // Send POST request to reschedule the appointment
      const response = await axios.post(
        url,
        formData, // URL-encoded form-data
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${this.accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded', // Specify form-data encoding
          },
        }
      );

      // Send back the response to the client
      return res.status(HttpStatus.OK).json(response.data);
    } catch (error) {
      console.error('Error rescheduling appointment:', error.response?.data || error.message);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.response?.data?.response?.errormessage || error.message,
      });
    }
  }

}

  
