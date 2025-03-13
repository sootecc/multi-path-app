import React, { useState, useEffect, useRef } from 'react';

const MultiPathOptimizationMap = () => {
  const [locations, setLocations] = useState([]);
  const [newLocation, setNewLocation] = useState('');
  const [optimizedRoute, setOptimizedRoute] = useState([]);
  const [optimizationCriteria, setOptimizationCriteria] = useState('distance');
  const [isCalculating, setIsCalculating] = useState(false);
  const [kakaoMap, setKakaoMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [polylines, setPolylines] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const mapRef = useRef(null);
  const placesService = useRef(null);

  // 카카오맵 API 로드 및 초기화
  useEffect(() => {
    const loadKakaoMap = () => {
      try {
        // 이미 카카오맵 스크립트가 로드되어 있는지 확인
        if (window.kakao && window.kakao.maps) {
          console.log('Kakao Maps API already loaded');
          initMap();
          return;
        }

        console.log('Loading Kakao Maps API...');
        const script = document.createElement('script');
        script.async = true;
        
        // API 키 설정 및 디버깅
        const KAKAO_MAP_API_KEY = process.env.REACT_APP_KAKAO_MAP_API_KEY;
        console.log('환경 변수 확인:', {
          'REACT_APP_KAKAO_MAP_API_KEY 존재 여부': !!process.env.REACT_APP_KAKAO_MAP_API_KEY,
          'process.env 키 목록': Object.keys(process.env).filter(key => key.startsWith('REACT_APP_')),
          'NODE_ENV': process.env.NODE_ENV
        });
        
        if (!KAKAO_MAP_API_KEY) {
          console.error('Kakao Maps API key is not defined');
          alert('카카오맵 API 키가 설정되지 않았습니다. 환경 변수를 확인해주세요.');
          return;
        }
        
        script.src = `${window.location.protocol}//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_API_KEY}&libraries=services&autoload=false`;
        
        script.onerror = () => {
          console.error('Failed to load Kakao Maps API');
        };
        
        script.onload = () => {
          console.log('Kakao Maps API script loaded');
          window.kakao.maps.load(() => {
            console.log('Kakao Maps API initialized');
            initMap();
          });
        };
        
        document.head.appendChild(script);
      } catch (error) {
        console.error('Error loading Kakao Maps:', error);
      }
    };

    loadKakaoMap();
    
    // 컴포넌트 언마운트 시 정리
    return () => {
      try {
        if (markers.length > 0) {
          markers.forEach(marker => {
            if (marker.marker) marker.marker.setMap(null);
            if (marker.infowindow) marker.infowindow.close();
          });
        }
        
        if (polylines.length > 0) {
          polylines.forEach(polyline => {
            if (polyline) polyline.setMap(null);
          });
        }

        // 지도 인스턴스 제거
        if (kakaoMap) {
          setKakaoMap(null);
        }
      } catch (error) {
        console.error('Error cleaning up map:', error);
      }
    };
  }, []); // 의존성 배열을 비워서 한 번만 실행되도록 수정

  // 지도 초기화 함수
  const initMap = () => {
    try {
      if (!mapRef.current) {
        console.error('Map container not found');
        return;
      }

      console.log('Initializing map...');
      const options = {
        center: new window.kakao.maps.LatLng(37.5665, 126.9780), // 서울 시청
        level: 7
      };
      
      const map = new window.kakao.maps.Map(mapRef.current, options);
      setKakaoMap(map);
      
      // 장소 검색 객체 생성
      if (!window.kakao.maps.services) {
        console.error('Kakao Maps Services library not loaded');
        return;
      }
      
      placesService.current = new window.kakao.maps.services.Places();
      console.log('Map and Places service initialized successfully');
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  };

  // 키워드 검색 함수
  const searchPlaces = () => {
    console.log('Searching places...', { newLocation, kakaoMap, placesService: placesService.current });
    
    if (!newLocation.trim()) {
      console.log('No search term provided');
      return;
    }
    
    if (!kakaoMap) {
      console.error('Map not initialized');
      return;
    }
    
    if (!placesService.current) {
      console.error('Places service not initialized');
      return;
    }
    
    setIsSearching(true);
    setSearchResults([]);
    
    // 키워드로 장소 검색
    placesService.current.keywordSearch(newLocation, (data, status) => {
      console.log('Search results:', { status, data });
      
      if (status === window.kakao.maps.services.Status.OK) {
        // 검색 결과 처리
        const results = data.map(item => ({
          id: item.id || String(Date.now()),
          name: item.place_name,
          lat: parseFloat(item.y),
          lng: parseFloat(item.x),
          address: item.address_name,
          roadAddress: item.road_address_name,
          phone: item.phone,
          category: item.category_group_name
        }));
        
        console.log('Processed results:', results);
        setSearchResults(results);
      } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
        console.log('No results found');
        alert('검색 결과가 없습니다.');
      } else {
        console.error('Search failed:', status);
        alert('검색 중 오류가 발생했습니다.');
      }
      
      setIsSearching(false);
    });
  };
  
  // 검색 결과에서 위치 선택
  const selectLocation = (location) => {
    const newLoc = {
      id: Date.now(),
      name: location.name,
      lat: location.lat,
      lng: location.lng,
      address: location.address,
      roadAddress: location.roadAddress,
      phone: location.phone,
      category: location.category
    };
    
    const newLocations = [...locations, newLoc];
    setLocations(newLocations);
    
    // 마커 추가
    addMarkerToMap(newLoc);
    
    // 지도 중심 및 줌 조정
    updateMapBounds(newLocations);
    
    // 검색 초기화
    setNewLocation('');
    setSearchResults([]);
  };

  // 마커 추가 함수
  const addMarkerToMap = (location) => {
    if (!kakaoMap) {
      console.error('지도가 초기화되지 않았습니다.');
      return;
    }
    
    console.log('마커 추가:', location);
    
    try {
      // 마커 생성
      const markerPosition = new window.kakao.maps.LatLng(location.lat, location.lng);
      const marker = new window.kakao.maps.Marker({
        position: markerPosition,
        map: kakaoMap
      });
      
      // 인포윈도우 생성
      const iwContent = `<div style="padding:5px;">${location.name}</div>`;
      const infowindow = new window.kakao.maps.InfoWindow({
        content: iwContent,
        removable: true
      });
      
      // 마커 클릭 시 인포윈도우 표시
      window.kakao.maps.event.addListener(marker, 'click', function() {
        markers.forEach(m => m.infowindow.close());
        infowindow.open(kakaoMap, marker);
      });
      
      // 마커를 상태에 저장
      setMarkers(prev => {
        console.log('마커 상태 업데이트:', [...prev, { marker, infowindow, location }]);
        return [...prev, { marker, infowindow, location }];
      });
      
      console.log('마커가 성공적으로 추가되었습니다.');
    } catch (error) {
      console.error('마커 추가 중 오류 발생:', error);
    }
  };

  // 지도 영역 조정
  const updateMapBounds = (locs) => {
    if (!kakaoMap || locs.length === 0) return;
    
    // 모든 위치를 포함하는 영역 생성
    const bounds = new window.kakao.maps.LatLngBounds();
    
    locs.forEach(loc => {
      bounds.extend(new window.kakao.maps.LatLng(loc.lat, loc.lng));
    });
    
    // 지도 영역 설정
    kakaoMap.setBounds(bounds);
  };

  // 위치 제거 함수
  const removeLocation = (id) => {
    // 위치 목록에서 제거
    const newLocations = locations.filter(loc => loc.id !== id);
    setLocations(newLocations);
    
    // 마커 제거
    const targetMarkerIndex = markers.findIndex(m => m.location.id === id);
    if (targetMarkerIndex !== -1) {
      markers[targetMarkerIndex].marker.setMap(null);
      markers[targetMarkerIndex].infowindow.close();
      const newMarkers = markers.filter((_, index) => index !== targetMarkerIndex);
      setMarkers(newMarkers);
    }
    
    // 경로가 있으면 초기화
    if (optimizedRoute.length > 0) {
      setOptimizedRoute([]);
      clearRouteDisplay();
    }
    
    // 지도 영역 업데이트
    if (newLocations.length > 0) {
      updateMapBounds(newLocations);
    }
  };

  // 두 위치 간의 거리 계산 (하버사인 공식)
  const calculateDistance = (loc1, loc2) => {
    const R = 6371; // 지구 반경 (km)
    const dLat = deg2rad(loc2.lat - loc1.lat);
    const dLng = deg2rad(loc2.lng - loc1.lng);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(loc1.lat)) * Math.cos(deg2rad(loc2.lat)) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };

  // 거리 행렬 생성
  const createDistanceMatrix = (locs) => {
    const matrix = Array(locs.length).fill().map(() => Array(locs.length).fill(0));
    
    for (let i = 0; i < locs.length; i++) {
      for (let j = i + 1; j < locs.length; j++) {
        const distance = calculateDistance(locs[i], locs[j]);
        matrix[i][j] = distance;
        matrix[j][i] = distance; // 대칭 행렬
      }
    }
    
    return matrix;
  };

  // 2-Opt 알고리즘으로 경로 최적화
  const twoOptSwap = (route, i, j) => {
    const newRoute = [...route];
    // i+1부터 j까지 역순으로 변경
    let start = i + 1;
    let end = j;
    while (start < end) {
      const temp = newRoute[start];
      newRoute[start] = newRoute[end];
      newRoute[end] = temp;
      start++;
      end--;
    }
    return newRoute;
  };

  const calculateTotalDistance = (route, distanceMatrix) => {
    let totalDistance = 0;
    for (let i = 0; i < route.length - 1; i++) {
      totalDistance += distanceMatrix[route[i]][route[i + 1]];
    }
    return totalDistance;
  };

  const twoOptAlgorithm = (locs, distanceMatrix) => {
    // 초기 경로: 주어진 순서대로
    let route = [...Array(locs.length).keys()];
    let bestDistance = calculateTotalDistance(route, distanceMatrix);
    let improved = true;
    let iterations = 0;
    const maxIterations = 100; // 무한 루프 방지
    
    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;
      
      for (let i = 0; i < route.length - 2; i++) {
        for (let j = i + 2; j < route.length; j++) {
          const newRoute = twoOptSwap(route, i, j);
          const newDistance = calculateTotalDistance(newRoute, distanceMatrix);
          
          if (newDistance < bestDistance) {
            route = newRoute;
            bestDistance = newDistance;
            improved = true;
            break;
          }
        }
        if (improved) break;
      }
    }
    
    return route.map(index => locs[index]);
  };

  // 경로 계산 함수
  const calculateOptimalRoute = () => {
    if (locations.length < 2) {
      alert('최소 2개 이상의 위치를 입력해주세요.');
      return;
    }

    setIsCalculating(true);
    
    try {
      console.log('경로 계산 시작:', locations);
      
      // 거리 행렬 생성
      const distanceMatrix = createDistanceMatrix(locations);
      
      // 경로 계산 (2-Opt 알고리즘 사용)
      const optimizedPath = twoOptAlgorithm(locations, distanceMatrix);
      console.log('계산된 최적 경로:', optimizedPath);
      
      // 상태 업데이트 전에 경로 표시
      displayOptimizedRoute(optimizedPath);
      
      // 상태 업데이트
      setOptimizedRoute(optimizedPath);
      setIsCalculating(false);
    } catch (error) {
      console.error('경로 계산 중 오류 발생:', error);
      setIsCalculating(false);
      alert('경로 계산 중 오류가 발생했습니다.');
    }
  };

  // 지도에 경로 표시
  const displayOptimizedRoute = (route) => {
    if (!kakaoMap || !route || route.length < 2) {
      console.error('지도가 초기화되지 않았거나 경로가 충분하지 않습니다.');
      return;
    }
    
    console.log('최적화된 경로 표시 시작:', route);
    
    try {
      // 좌표 유효성 검사
      const validRoute = route.filter(loc => {
        if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number' || 
            isNaN(loc.lat) || isNaN(loc.lng) || !isFinite(loc.lat) || !isFinite(loc.lng)) {
          console.error('유효하지 않은 좌표:', loc);
          return false;
        }
        return true;
      });

      if (validRoute.length < 2) {
        console.error('유효한 좌표가 2개 미만입니다.');
        return;
      }

      console.log('유효한 경로 좌표:', validRoute);

      // 기존 마커와 경로 제거
      clearRouteDisplay();
      markers.forEach(marker => {
        if (marker.marker) marker.marker.setMap(null);
        if (marker.infowindow) marker.infowindow.close();
      });

      const newMarkers = [];
      const pathCoordinates = [];

      // 각 위치에 마커 생성 및 경로 좌표 수집
      validRoute.forEach((loc, index) => {
        try {
          const position = new window.kakao.maps.LatLng(loc.lat, loc.lng);
          pathCoordinates.push(position);

          // 마커 이미지 설정
          const markerSize = new window.kakao.maps.Size(35, 35);
          const markerImage = new window.kakao.maps.MarkerImage(
            `https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_number_blue_${index + 1}.png`,
            markerSize
          );

          // 마커 생성
          const marker = new window.kakao.maps.Marker({
            position: position,
            map: kakaoMap,
            image: markerImage
          });

          // 인포윈도우 내용
          const nextLocation = index < validRoute.length - 1 ? validRoute[index + 1] : null;
          const distance = nextLocation ? calculateDistance(loc, nextLocation) : null;

          const iwContent = `
            <div style="padding:10px;min-width:200px;">
              <div style="font-weight:bold;font-size:14px;margin-bottom:5px;">
                ${index + 1}. ${loc.name}
              </div>
              <div style="font-size:12px;color:#666;margin-bottom:5px;">
                ${loc.roadAddress || loc.address}
              </div>
              ${distance !== null ? 
                `<div style="font-size:12px;color:#2196F3;margin-top:5px;border-top:1px solid #eee;padding-top:5px;">
                  다음 지점까지: ${distance.toFixed(2)}km
                </div>` : ''}
            </div>
          `;

          const infowindow = new window.kakao.maps.InfoWindow({
            content: iwContent,
            removable: true
          });

          // 마커 클릭 이벤트
          window.kakao.maps.event.addListener(marker, 'click', function() {
            newMarkers.forEach(m => m.infowindow.close());
            infowindow.open(kakaoMap, marker);
          });

          newMarkers.push({ marker, infowindow, location: loc });
          console.log(`마커 ${index + 1} 생성 완료:`, loc.name);
        } catch (error) {
          console.error(`위치 ${index + 1} 처리 중 오류:`, error);
        }
      });

      // 경로선 그리기
      if (pathCoordinates.length >= 2) {
        try {
          const polyline = new window.kakao.maps.Polyline({
            path: pathCoordinates,
            strokeWeight: 4,
            strokeColor: '#2196F3',
            strokeOpacity: 0.7,
            strokeStyle: 'solid'
          });

          polyline.setMap(kakaoMap);
          setPolylines([polyline]);
          console.log('경로선 그리기 완료');
        } catch (error) {
          console.error('경로선 그리기 중 오류:', error);
        }
      }

      // 마커 상태 업데이트
      setMarkers(newMarkers);

      // 지도 영역 조정
      try {
        const bounds = new window.kakao.maps.LatLngBounds();
        pathCoordinates.forEach(position => bounds.extend(position));
        kakaoMap.setBounds(bounds, { padding: 150 });
        console.log('지도 영역 조정 완료');
      } catch (error) {
        console.error('지도 영역 조정 중 오류:', error);
      }

      // 첫 번째 마커의 인포윈도우 표시
      if (newMarkers.length > 0) {
        newMarkers[0].infowindow.open(kakaoMap, newMarkers[0].marker);
      }

      console.log('경로 표시 완료:', {
        마커수: newMarkers.length,
        경로좌표수: pathCoordinates.length
      });
    } catch (error) {
      console.error('경로 표시 중 오류 발생:', error);
    }
  };

  // 경로 표시 초기화
  const clearRouteDisplay = () => {
    try {
      // 기존 폴리라인 제거
      polylines.forEach(polyline => {
        if (polyline) {
          polyline.setMap(null);
        }
      });
      setPolylines([]);

      console.log('경로 표시 초기화 완료');
    } catch (error) {
      console.error('경로 초기화 중 오류 발생:', error);
    }
  };

  // 경로 초기화 함수
  const resetRoute = () => {
    setOptimizedRoute([]);
    clearRouteDisplay();
  };

  // 최적화 기준 변경 함수
  const handleCriteriaChange = (e) => {
    setOptimizationCriteria(e.target.value);
    if (optimizedRoute.length > 0) {
      resetRoute();
    }
  };

  // 모든 데이터 초기화
  const resetAll = () => {
    resetRoute();
    
    // 모든 마커 제거
    markers.forEach(marker => {
      marker.marker.setMap(null);
      marker.infowindow.close();
    });
    
    setMarkers([]);
    setLocations([]);
  };

  // Enter 키 처리 함수
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchPlaces();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 p-4 rounded-lg">
      <h1 className="text-2xl font-bold mb-4 text-blue-800">다중경로최적화 지도 서비스</h1>
      
      {/* 컨트롤 패널 */}
      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            type="text"
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
            placeholder="위치 검색 (예: 서울역, 강남역, 카페)"
            className="flex-grow p-2 border rounded"
            onKeyPress={handleKeyPress}
          />
          <button 
            onClick={searchPlaces}
            disabled={isSearching}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-400"
          >
            {isSearching ? '검색 중...' : '검색'}
          </button>
        </div>
        
        {/* 검색 결과 목록 */}
        {searchResults.length > 0 && (
          <div className="mb-4 max-h-60 overflow-y-auto border rounded p-2 bg-gray-50">
            <h3 className="font-semibold mb-2">검색 결과 ({searchResults.length}개)</h3>
            <ul className="divide-y divide-gray-200">
              {searchResults.map((result) => (
                <li 
                  key={result.id} 
                  className="py-2 hover:bg-gray-100 cursor-pointer" 
                  onClick={() => selectLocation(result)}
                >
                  <div className="font-medium">{result.name}</div>
                  <div className="text-sm text-gray-600">
                    {result.roadAddress || result.address}
                  </div>
                  {result.category && (
                    <div className="text-xs text-gray-500">
                      {result.category} {result.phone && `| ${result.phone}`}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="mb-4">
          <label className="block mb-2 font-semibold">최적화 기준:</label>
          <select 
            value={optimizationCriteria}
            onChange={handleCriteriaChange}
            className="w-full p-2 border rounded"
          >
            <option value="distance">거리</option>
            <option value="time">시간</option>
            <option value="cost">비용</option>
          </select>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={calculateOptimalRoute}
            disabled={isCalculating || locations.length < 2}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 flex-grow"
          >
            {isCalculating ? '계산 중...' : '최적 경로 계산'}
          </button>
          <button 
            onClick={resetRoute}
            disabled={optimizedRoute.length === 0}
            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 disabled:bg-gray-400"
          >
            경로 초기화
          </button>
          <button 
            onClick={resetAll}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            전체 초기화
          </button>
        </div>
      </div>
      
      {/* 위치 목록 */}
      <div className="bg-white p-4 rounded-lg shadow mb-4 overflow-auto">
        <h2 className="text-lg font-bold mb-2">입력된 위치 목록</h2>
        {locations.length === 0 ? (
          <p className="text-gray-500">추가된 위치가 없습니다.</p>
        ) : (
          <ul className="divide-y">
            {locations.map((loc, index) => (
              <li key={loc.id} className="py-2 flex justify-between items-center">
                <span>
                  <span className="font-semibold">{index + 1}.</span> {loc.name}
                  <span className="text-gray-500 text-sm ml-2">
                    ({loc.lat.toFixed(4)}, {loc.lng.toFixed(4)})
                  </span>
                </span>
                <button 
                  onClick={() => removeLocation(loc.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {/* 최적화된 경로 */}
      {optimizedRoute.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow mb-4 overflow-auto">
          <h2 className="text-lg font-bold mb-2">최적화된 경로</h2>
          <p className="mb-2 text-sm">
            최적화 기준: <span className="font-semibold">
              {optimizationCriteria === 'distance' ? '최단 거리' : 
               optimizationCriteria === 'time' ? '최소 시간' : '최소 비용'}
            </span>
          </p>
          <ol className="list-decimal list-inside">
            {optimizedRoute.map((loc, index) => (
              <li key={index} className="py-1">
                {loc.name}
                {index < optimizedRoute.length - 1 && (
                  <span className="text-gray-500 text-sm ml-2">
                    → {calculateDistance(loc, optimizedRoute[index + 1]).toFixed(2)} km
                  </span>
                )}
              </li>
            ))}
          </ol>
          <div className="mt-3 pt-3 border-t">
            <p className="font-semibold">
              총 거리: {optimizedRoute.reduce((total, loc, idx) => {
                if (idx === optimizedRoute.length - 1) return total;
                return total + calculateDistance(loc, optimizedRoute[idx + 1]);
              }, 0).toFixed(2)} km
            </p>
          </div>
        </div>
      )}
      
      {/* 지도 */}
      <div className="bg-white p-4 rounded-lg shadow flex-grow">
        <h2 className="text-lg font-bold mb-2">지도</h2>
        <div 
          ref={mapRef} 
          className="rounded border w-full"
          style={{ 
            position: 'relative', 
            overflow: 'hidden',
            height: '500px' // 지도 높이를 500px로 설정
          }}
        >
          {!kakaoMap && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <p className="text-gray-500">지도를 불러오는 중...</p>
            </div>
          )}
        </div>
        <div className="mt-2 text-sm text-gray-500">
          <p>* 카카오맵 API가 로드되지 않으면 개발자 도구의 콘솔을 확인해주세요.</p>
          <p>* http://localhost:3000 도메인이 카카오 개발자 센터에 등록되어 있어야 합니다.</p>
        </div>
      </div>
    </div>
  );
};

export default MultiPathOptimizationMap;
