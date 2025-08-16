-- CORS handler for Orthanc DICOM-Web plugin
function OnHttpRequest(method, uri, headers, get)
  
  -- Add CORS headers to all responses
  local corsHeaders = {
    ['Access-Control-Allow-Origin'] = '*',
    ['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
    ['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Cache-Control, X-Requested-With, Accept, Origin, DNT, User-Agent, If-Modified-Since, Keep-Alive, X-File-Name, X-File-Size, X-Mime-Type, Range',
    ['Access-Control-Allow-Credentials'] = 'false',
    ['Access-Control-Max-Age'] = '86400',
    ['Access-Control-Expose-Headers'] = 'Content-Length, Content-Type, Date, Server, Content-Range, Accept-Ranges'
  }

  -- Handle preflight requests
  if method == 'OPTIONS' then
    RestApiOutput.SetCorsHeaders(corsHeaders)
    return
  end

  -- For all other requests, let Orthanc handle them normally but add CORS headers
  if string.match(uri, '/dicom-web/.*') then
    RestApiOutput.SetCorsHeaders(corsHeaders)
  end
end